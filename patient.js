// ===== Patient Interface Logic =====

// --- State ---
let currentStep = 1;
let selectedBloodGroup = null;
let selectedUrgency = null;
let selectedHospital = null;
let units = 1;

// --- Sample Data ---
const hospitals = [
  'Apollo Hospital, Chennai',
  'AIIMS, Delhi',
  'CMC, Vellore',
  'Fortis Hospital, Bangalore',
  'JIPMER, Puducherry',
  'KMC Hospital, Mangalore',
  'Manipal Hospital, Bangalore',
  'Meenakshi Mission Hospital, Madurai',
  'Rajiv Gandhi Government Hospital, Chennai',
  'SRM Hospital, Chennai',
  'Stanley Medical College Hospital, Chennai',
  'Government General Hospital, Chennai',
];

function generateDonors(bloodGroup) {
  const distances = [0.8, 1.2, 1.5, 2.3, 3.1, 4.0];
  const statuses = ['Available', 'Available', 'Available', 'Busy', 'Available', 'Busy'];
  const count = 4 + Math.floor(Math.random() * 3);
  const donors = [];
  for (let i = 0; i < count; i++) {
    donors.push({
      bloodGroup: bloodGroup,
      status: statuses[i % statuses.length],
      distance: distances[i % distances.length],
    });
  }
  return donors.sort((a, b) => a.distance - b.distance);
}

// --- DOM References ---
const progressFill = document.getElementById('progress-fill');
const progressSteps = document.querySelectorAll('.progress-step');

// --- Navigation ---
function goToStep(step) {
  // Hide current
  document.querySelector('.form-step.active')?.classList.remove('active');
  // Show next
  document.getElementById(`step-${step}`).classList.add('active');
  currentStep = step;

  // Update progress bar
  const pct = (step / 5) * 100;
  progressFill.style.width = `${pct}%`;

  progressSteps.forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sNum < step) s.classList.add('done');
    else if (sNum === step) s.classList.add('active');
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Patient State & Navigation =====
let currentUser = null;
let patientGender = null;

// Progress bar steps update (4 steps)
function goToStep(step) {
  document.querySelector('.form-step.active')?.classList.remove('active');
  document.getElementById(`step-${step}`)?.classList.add('active');
  currentStep = step;

  const pct = (step / 4) * 100;
  if (progressFill) progressFill.style.width = `${pct}%`;

  progressSteps.forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sNum < step) s.classList.add('done');
    else if (sNum === step) s.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Patient Gender Toggle
document.getElementById('patient-gender-group')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.toggle-gender-btn');
  if (!btn) return;
  document.querySelectorAll('.toggle-gender-btn').forEach(b => {
    b.style.background = 'var(--white)';
    b.style.color = 'var(--red)';
  });
  btn.style.background = 'var(--red)';
  btn.style.color = 'var(--white)';
  patientGender = btn.dataset.val;
});

// Page Initialization
document.addEventListener('DOMContentLoaded', async () => {
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
    window.location.href = 'auth.html?intent=patient';
  } else {
    currentUser = session.user;
    await initPatientPage();
  }
});

async function initPatientPage() {
  if (!currentUser) return;

  const profile = await getPatientProfileAsync(currentUser.id);
  if (profile) {
    // Pre-fill existing patient profile
    if (document.getElementById('patient-name')) document.getElementById('patient-name').value = profile.full_name || '';
    if (document.getElementById('attendant-name')) document.getElementById('attendant-name').value = profile.attendant_name || '';
    if (document.getElementById('phone-contact')) document.getElementById('phone-contact').value = (profile.attendant_phone || currentUser.phone).replace('+91', '').trim();
    if (document.getElementById('patient-age')) document.getElementById('patient-age').value = profile.age || '';
    
    if (profile.gender) {
      patientGender = profile.gender;
      const genderBtn = document.querySelector(`.toggle-gender-btn[data-val="${profile.gender}"]`);
      if (genderBtn) {
        genderBtn.style.background = 'var(--red)';
        genderBtn.style.color = 'var(--white)';
      }
    }

    // Skip to Blood Request Step (Step 2)
    goToStep(2);
  } else {
    // Show Patient Details Form (Step 1)
    if (document.getElementById('phone-contact')) {
      document.getElementById('phone-contact').value = (currentUser.phone || '').replace('+91', '').trim();
    }
    goToStep(1);
  }
}

// Step 1: Save Patient Details
document.getElementById('btn-details-continue')?.addEventListener('click', async () => {
  const patientName = document.getElementById('patient-name').value.trim();
  const attendantName = document.getElementById('attendant-name').value.trim();
  const phone = document.getElementById('phone-contact').value.trim();
  const age = document.getElementById('patient-age')?.value.trim();

  if (!patientName) { shakeElement(document.getElementById('patient-name')); return; }
  if (!attendantName) { shakeElement(document.getElementById('attendant-name')); return; }
  if (!phone || phone.length < 10) { shakeElement(document.getElementById('phone-contact').closest('.input-phone')); return; }

  if (currentUser) {
    savePatientProfile(currentUser.id, {
      full_name: patientName,
      attendant_name: attendantName,
      attendant_phone: `+91${phone}`,
      age: parseInt(age || 30, 10),
      gender: patientGender || 'other'
    });
  }

  goToStep(2);
});

// ===== Step 2: Patient Details =====
document.getElementById('btn-details-continue').addEventListener('click', () => {
  const patientName = document.getElementById('patient-name').value.trim();
  const attendantName = document.getElementById('attendant-name').value.trim();
  const phone = document.getElementById('phone-contact').value.trim();

  if (!patientName) { shakeElement(document.getElementById('patient-name')); return; }
  if (!attendantName) { shakeElement(document.getElementById('attendant-name')); return; }
  if (phone.length < 10 || !/^\d{10}$/.test(phone)) {
    shakeElement(document.getElementById('phone-contact').closest('.input-phone'));
    return;
  }

  goToStep(3);
});

// ===== Step 3: Blood Request =====

// Hospital dropdown
const hospitalSearch = document.getElementById('hospital-search');
const hospitalList = document.getElementById('hospital-list');

function renderHospitals(filter = '') {
  const filtered = hospitals.filter(h => h.toLowerCase().includes(filter.toLowerCase()));
  hospitalList.innerHTML = filtered.map(h =>
    `<li${h === selectedHospital ? ' class="selected"' : ''}>${h}</li>`
  ).join('');

  if (filtered.length > 0) {
    hospitalList.classList.add('open');
  } else {
    hospitalList.classList.remove('open');
  }
}

hospitalSearch.addEventListener('focus', () => renderHospitals(hospitalSearch.value));
hospitalSearch.addEventListener('input', () => renderHospitals(hospitalSearch.value));

hospitalList.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    selectedHospital = e.target.textContent;
    hospitalSearch.value = selectedHospital;
    hospitalList.classList.remove('open');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#hospital-dropdown')) {
    hospitalList.classList.remove('open');
  }
});

// Blood group selection
document.getElementById('blood-group-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.bg-btn');
  if (!btn) return;
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedBloodGroup = btn.dataset.bg;
});

// Units +/-
document.getElementById('units-minus').addEventListener('click', () => {
  if (units > 1) {
    units--;
    document.getElementById('units-value').textContent = units;
  }
});

document.getElementById('units-plus').addEventListener('click', () => {
  if (units < 10) {
    units++;
    document.getElementById('units-value').textContent = units;
  }
});

// Urgency selection
document.getElementById('urgency-group').addEventListener('click', (e) => {
  const btn = e.target.closest('.urgency-btn');
  if (!btn) return;
  document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedUrgency = btn.dataset.urgency;
});

// Find donors
document.getElementById('btn-find-donors').addEventListener('click', () => {
  if (!selectedHospital) { shakeElement(hospitalSearch); return; }
  if (!selectedBloodGroup) { shakeElement(document.getElementById('blood-group-grid')); return; }
  if (!selectedUrgency) { shakeElement(document.getElementById('urgency-group')); return; }

  // Render donors
  const donors = generateDonors(selectedBloodGroup);
  const donorListEl = document.getElementById('donor-list');
  donorListEl.innerHTML = donors.map(d => `
    <div class="donor-card">
      <div class="donor-bg">${d.bloodGroup}</div>
      <div class="donor-info">
        <span class="donor-meta">${d.bloodGroup} • ${d.status}</span>
        <span class="donor-distance">${d.distance} km from hospital</span>
      </div>
      <span class="donor-badge ${d.status === 'Available' ? 'donor-badge--available' : 'donor-badge--busy'}">${d.status}</span>
    </div>
  `).join('');

  document.getElementById('donors-subtitle').textContent =
    `${donors.filter(d => d.status === 'Available').length} donors available near ${selectedHospital.split(',')[0]}.`;

  goToStep(4);
});

// ===== Step 4: Send Request =====
document.getElementById('btn-send-request').addEventListener('click', () => {
  goToStep(5);
  runStatusAnimation();
});

// ===== Step 5: Status Animation =====
function runStatusAnimation() {
  const now = new Date();
  const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Step 1: Request Sent (already done)
  document.getElementById('status-sent-time').textContent = formatTime(now);

  // Step 2: Donors Notified after 2s
  setTimeout(() => {
    const el = document.getElementById('status-notified');
    el.classList.add('done');
    el.querySelector('.status-icon').innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.getElementById('status-notified-time').textContent = formatTime(new Date());
    // Mark next connector
    el.previousElementSibling.style.background = '#27AE60';
  }, 2000);

  // Step 3: Donor Accepted after 5s
  setTimeout(() => {
    const el = document.getElementById('status-accepted');
    el.classList.add('active-status');
    document.getElementById('status-accepted-time').textContent = 'Waiting...';
    el.previousElementSibling.style.background = 'var(--red-light)';
  }, 4000);

  setTimeout(() => {
    const el = document.getElementById('status-accepted');
    el.classList.remove('active-status');
    el.classList.add('done');
    el.querySelector('.status-icon').innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.getElementById('status-accepted-time').textContent = formatTime(new Date());
    el.previousElementSibling.style.background = '#27AE60';
  }, 7000);

  // Step 4: Donation Confirmed after 10s
  setTimeout(() => {
    const el = document.getElementById('status-confirmed');
    el.classList.add('active-status');
    document.getElementById('status-confirmed-time').textContent = 'In progress...';
    el.previousElementSibling.style.background = 'var(--red-light)';
  }, 8000);

  setTimeout(() => {
    const el = document.getElementById('status-confirmed');
    el.classList.remove('active-status');
    el.classList.add('done');
    el.querySelector('.status-icon').innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.getElementById('status-confirmed-time').textContent = formatTime(new Date());
    el.previousElementSibling.style.background = '#27AE60';
  }, 11000);
}

// ===== Utilities =====
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

// Add shake keyframes dynamically
const style = document.createElement('style');
style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`;
document.head.appendChild(style);

// Mobile menu
const menuBtn = document.getElementById('mobile-menu-btn');
const nav = document.getElementById('nav');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav--open');
    menuBtn.classList.toggle('active', isOpen);
  });
}
