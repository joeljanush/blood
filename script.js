// Mobile menu toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const nav = document.getElementById('nav');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav--open');
    menuBtn.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
}

// Close mobile menu on link click
nav?.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav--open');
    menuBtn?.classList.remove('active');
  });
});

// Header shadow on scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header?.classList.toggle('header--scrolled', window.scrollY > 10);
}, { passive: true });


"// Session-aware routing — logged-in users go direct; others go to auth page with intent
async function route(e, intent, dest) {
  e.preventDefault();
  try {
    const client = getSupabase();
    if (client && client.auth) {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        window.location.href = dest;
        return;
      }
    }
    const s = getStoredSession();
    if (s && s.user) {
      window.location.href = dest;
      return;
    }
  } catch (_) {}
  window.location.href = 'auth.html?intent=' + intent;
}

document.getElementById('btn-need-blood')?.addEventListener('click',   e => route(e, 'patient', 'patient.html'));
document.getElementById('btn-cta-need')?.addEventListener('click',     e => route(e, 'patient', 'patient.html'));
document.getElementById('btn-donate-blood')?.addEventListener('click', e => route(e, 'donor',   'donor.html'));
document.getElementById('btn-cta-donate')?.addEventListener('click',   e => route(e, 'donor',   'donor.html'));


