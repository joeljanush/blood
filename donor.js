// ===== LifeLink Donor Interface =====

// --- Donor State ---
const donor = {
  phone: '',
  name: '',
  age: '',
  gender: '',
  area: '',
  lastDonation: '',
  bloodGroup: '',
  available: true,
  donations: [],
};

// Sample emergency request
const sampleRequest = {
  id: 1,
  bloodGroup: 'B+',
  units: 2,
  hospital: 'Government Rajaji Hospital',
  city: 'Madurai',
  distance: '2.1',
  urgency: 'Emergency',
};

let activeRequests = [sampleRequest];
let currentScreen = 'login';

// --- Helpers ---
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

function show(screenId) {
  document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
  const screen = $(`screen-${screenId}`);
  screen.classList.add('active');
  currentScreen = screenId;
  window.scrollTo({ top: 0 });

  // App mode screens get bottom nav
  const appScreens = ['home', 'requests-tab', 'history', 'profile'];
  const isApp = appScreens.includes(screenId);
  document.body.classList.toggle('app-mode', isApp);
  $('bottom-nav').classList.toggle('hidden', !isApp);

  // Update bottom nav active
  if (isApp) {
    $$('.bnav-item').forEach(b => b.classList.remove('active'));
    const tab = screenId === 'requests-tab' ? 'requests-tab' : screenId;
    document.querySelector(`.bnav-item[data-tab="${tab}"]`)?.classList.add('active');
  }
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ===========================
//    DONOR APP INITIALIZATION
// ===========================
let currentUser = null;

"document.addEventListener('DOMContentLoaded', async () => {
  let session = getStoredSession();
  const client = getSupabase();
  if (client && client.auth) {
    try {
      const { data: { session: supaSession } } = await client.auth.getSession();
      if (supaSession?.user) {
        const formattedPhone = supaSession.user.phone || supaSession.user.user_metadata?.phone || `+91${supaSession.user.email?.replace('@phone.lifelink.app', '').replace('91', '')}`;
        session = { user: { id: supaSession.user.id, phone: formattedPhone, is_active: true } };
        saveSession(session);
      } else if (!supaSession) {
        session = null;
        clearSession();
      }
    } catch (e) {}
  }

  if (!session || !session.user) {
    window.location.href = 'auth.html?intent=donor';
  } else {
    currentUser = session.user;
    await initDonorPage();
  }
});

async function initDonorPage() {
  if (!currentUser) return;
  donor.phone = currentUser.phone;

  const profile = await getDonorProfileAsync(currentUser.id);
  if (profile && profile.blood_group) {
    donor.name = profile.full_name || 'Donor';
    donor.age = profile.age || '';
    donor.gender = profile.gender || '';
    donor.area = profile.area || '';
    donor.bloodGroup = profile.blood_group || '';
    donor.available = profile.is_available !== undefined ? profile.is_available : true;
    donor.lastDonation = profile.last_donation_date || '';
    enterApp();
  } else {
    show('details');
  }
}

// Logout Button
$('btn-donor-logout')?.addEventListener('click', () => {
  logoutUser();
});

// ===========================
//    SCREEN 2: BASIC DETAILS
// ===========================
$('gender-group')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-btn');
  if (!btn) return;
  $$('#gender-group .toggle-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  donor.gender = btn.dataset.val;
});

$('btn-details')?.addEventListener('click', () => {
  const name = $('detail-name').value.trim();
  const age = $('detail-age').value.trim();
  const area = $('detail-area').value.trim();

  if (!name) { shake($('detail-name')); return; }
  if (!age || age < 18 || age > 65) { shake($('detail-age')); return; }
  if (!donor.gender) { shake($('gender-group')); return; }
  if (!area) { shake($('detail-area')); return; }

  donor.name = name;
  donor.age = age;
  donor.area = area;
  donor.lastDonation = $('detail-lastdonation').value || '';

  show('bloodgroup');
});

// ===========================
//    SCREEN 4: BLOOD GROUP
// ===========================
$('bg-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.bg-tile');
  if (!tile) return;
  $$('.bg-tile').forEach(t => t.classList.remove('selected'));
  tile.classList.add('selected');
  donor.bloodGroup = tile.dataset.bg;
});

$('btn-bloodgroup').addEventListener('click', () => {
  if (!donor.bloodGroup) { shake($('bg-grid')); return; }
  show('availability');
});

// ===========================
//    SCREEN 5: AVAILABILITY
// ===========================
$('avail-toggle').addEventListener('click', () => {
  donor.available = !donor.available;
  const tog = $('avail-toggle');
  tog.classList.toggle('available', donor.available);
  tog.classList.toggle('unavailable', !donor.available);
  $('avail-label').textContent = donor.available ? 'AVAILABLE' : 'NOT AVAILABLE';
});

$('btn-save-avail').addEventListener('click', () => {
  if (currentUser) {
    saveDonorProfile(currentUser.id, {
      full_name: donor.name,
      age: donor.age,
      gender: donor.gender,
      area: donor.area,
      blood_group: donor.bloodGroup,
      is_available: donor.available,
      last_donation_date: donor.lastDonation
    });
  }
  enterApp();
});

// ===========================
//    ENTER MAIN APP
// ===========================
function enterApp() {
  renderHome();
  show('home');
}

function renderHome() {
  // Name
  $('home-name').textContent = donor.name.split(' ')[0] || 'Donor';

  // Status
  const badge = $('home-status-badge');
  badge.className = `status-badge ${donor.available ? 'available' : 'unavailable'}`;
  badge.innerHTML = `<span class="status-dot"></span>${donor.available ? 'Available' : 'Not Available'}`;

  // Blood group
  $('home-bg').textContent = donor.bloodGroup || '—';

  // Requests
  renderRequests($('home-requests'));
  renderRequests($('requests-tab-list'));

  // Badge
  const reqBadge = $('bnav-req-badge');
  if (activeRequests.length > 0) {
    reqBadge.classList.remove('hidden');
    reqBadge.textContent = activeRequests.length;
  } else {
    reqBadge.classList.add('hidden');
  }

  // Profile (Dual Profile Status)
  $('prof-name').textContent = donor.name || 'Account User';
  $('prof-bg').textContent = donor.bloodGroup || '—';
  $('prof-age').textContent = donor.age || '—';
  $('prof-gender').textContent = donor.gender || '—';
  $('prof-area').textContent = donor.area || '—';
  $('prof-last').textContent = donor.lastDonation ? formatDate(donor.lastDonation) : 'N/A';
  $('prof-total').textContent = donor.donations.length;

  // Render Patient profile status if available
  const session = getStoredSession();
  if (session && session.user) {
    const patientProf = getPatientProfile(session.user.id);
    let patStatusEl = document.getElementById('patient-profile-status-box');
    if (!patStatusEl) {
      const card = document.querySelector('.profile-card');
      if (card) {
        card.insertAdjacentHTML('afterend', `
          <div id="patient-profile-status-box" style="background:var(--bg-light);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:16px;">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:6px;">Patient Profile Status</h3>
            <p id="pat-prof-desc" style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">${patientProf ? '✅ Active Patient Profile (' + patientProf.full_name + ')' : '⚠️ No Patient Profile created yet.'}</p>
            <a href="patient.html" class="btn btn--need btn--sm btn--full" style="font-size:13px;padding:8px;">${patientProf ? 'Go to Patient Request Flow' : 'Create Patient Profile / Need Blood'}</a>
          </div>
        `);
      }
    } else {
      document.getElementById('pat-prof-desc').textContent = patientProf ? '✅ Active Patient Profile (' + patientProf.full_name + ')' : '⚠️ No Patient Profile created yet.';
    }
  }

  // History
  renderHistory();
}

function renderRequests(container) {
  if (activeRequests.length === 0) {
    container.innerHTML = '<div class="no-requests">No emergency requests right now.</div>';
    if ($('requests-empty')) {
      $('requests-empty').classList.remove('hidden');
    }
    return;
  }

  if ($('requests-empty')) $('requests-empty').classList.add('hidden');

  container.innerHTML = activeRequests.map(r => `
    <div class="req-card" data-req-id="${r.id}">
      <div class="req-card-top">
        <span class="req-card-alert">🚨</span>
        <span class="req-card-title">Blood Needed</span>
      </div>
      <div class="req-card-info">
        <span class="req-card-line"><strong>${r.bloodGroup}</strong></span>
        <span class="req-card-line">${r.units} Units</span>
        <span class="req-card-sub">${r.hospital}</span>
        <span class="req-card-sub">${r.distance} km away</span>
      </div>
      <button class="req-card-btn" onclick="openRequest(${r.id})">View Request</button>
    </div>
  `).join('');
}

function renderHistory() {
  const container = $('history-list');
  const empty = $('history-empty');

  if (donor.donations.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = donor.donations.map(d => `
    <div class="history-card">
      <div class="history-bg">${d.bloodGroup}</div>
      <div class="history-info">
        <div class="history-title">${d.bloodGroup} | ${d.units} Units</div>
        <div class="history-sub">${d.hospital}<br>${d.date}</div>
      </div>
      <span class="history-badge">✅ Completed</span>
    </div>
  `).join('');
}

// ===========================
//    SCREEN 6 HOME: Actions
// ===========================
$('btn-change-status').addEventListener('click', () => {
  donor.available = !donor.available;
  renderHome();
});

// ===========================
//    SCREEN 7: OPEN REQUEST
// ===========================
window.openRequest = function(id) {
  const req = activeRequests.find(r => r.id === id);
  if (!req) return;

  $('req-bg').textContent = req.bloodGroup;
  $('req-units').textContent = `${req.units} Units`;
  $('req-hospital').textContent = req.hospital;
  $('req-distance').textContent = `${req.distance} km away`;
  $('req-urgency').textContent = req.urgency;

  // Store for later screens
  window._activeReq = req;
  show('request');
};

// ===========================
//    SCREEN 7: ACCEPT / DECLINE
// ===========================
$('btn-decline').addEventListener('click', () => {
  show('declined');
});

$('btn-accept').addEventListener('click', () => {
  const req = window._activeReq;
  $('accepted-hospital').textContent = req.hospital;
  $('accepted-bg-units').textContent = `${req.bloodGroup} | ${req.units} Units`;
  show('accepted');
});

// ===========================
//    SCREEN 8: DECLINED
// ===========================
$('btn-declined-home').addEventListener('click', () => {
  activeRequests = [];
  renderHome();
  show('home');
});

// ===========================
//    SCREEN 9: ACCEPTED
// ===========================
$('btn-view-hospital').addEventListener('click', () => {
  const req = window._activeReq;
  $('hosp-name').textContent = req.hospital;
  $('hosp-city').textContent = req.city;
  $('hosp-bg').textContent = req.bloodGroup;
  $('hosp-units').textContent = req.units;
  show('hospital');
});

// ===========================
//    SCREEN 10: HOSPITAL
// ===========================
$('btn-going').addEventListener('click', () => {
  // Reset screening state
  const dot = document.querySelector('#screening-status .screening-dot');
  dot.className = 'screening-dot pending';
  $('screening-label').textContent = 'Screening Pending';
  $('screening-hint').textContent = 'Waiting for the blood bank to update your screening status.';
  $('btn-screening-next').classList.add('hidden');
  $('btn-sim-screening').classList.remove('hidden');
  show('screening');
});

// ===========================
//    SCREEN 11: SCREENING
// ===========================
$('btn-sim-screening').addEventListener('click', () => {
  const dot = document.querySelector('#screening-status .screening-dot');
  dot.className = 'screening-dot approved';
  $('screening-label').textContent = 'Approved for Donation';
  $('screening-hint').textContent = 'You are cleared to donate. Proceed to the donation area.';
  $('btn-screening-next').classList.remove('hidden');
  $('btn-sim-screening').classList.add('hidden');
});

$('btn-screening-next').addEventListener('click', () => {
  const req = window._activeReq;

  // Record donation
  const donation = {
    bloodGroup: req.bloodGroup,
    units: req.units,
    hospital: req.hospital,
    date: formatDate(new Date()),
  };
  donor.donations.push(donation);
  donor.lastDonation = new Date().toISOString().split('T')[0];

  // Fill done screen
  $('done-bg').textContent = req.bloodGroup;
  $('done-units').textContent = req.units;
  $('done-hospital').textContent = req.hospital;
  $('done-date').textContent = formatDate(new Date());

  // Remove request
  activeRequests = activeRequests.filter(r => r.id !== req.id);

  show('done');
});

// ===========================
//    SCREEN 12: DONE
// ===========================
$('btn-done-home').addEventListener('click', () => {
  renderHome();
  show('home');
});

// ===========================
//    BOTTOM NAV
// ===========================
$$('.bnav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    renderHome();
    show(tab);
  });
});

// ===========================
//    PROFILE ACTIONS
// ===========================
$('btn-edit-profile').addEventListener('click', () => {
  // Simple: go back to details (in real app, would be inline edit)
  show('details');
});

$('btn-change-avail').addEventListener('click', () => {
  donor.available = !donor.available;
  renderHome();
  show('home');
});
