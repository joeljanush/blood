// ===== LifeLink Global Action-Based Auth Modal =====

let pendingAuthCallback = null;
let pendingActionIntent = null;

function initAuthModal() {
  if (document.getElementById('global-auth-modal')) return;

  const modalHtml = `
  <div id="global-auth-modal" class="auth-modal-backdrop hidden">
    <div class="auth-modal-card">
      <button type="button" class="auth-modal-close" id="btn-close-auth-modal" aria-label="Close modal">&times;</button>

      <!-- LifeLink Branding -->
      <div class="auth-modal-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2C12 2 4 10.5 4 15a8 8 0 0 0 16 0C20 10.5 12 2 12 2Z" fill="#C0392B"/>
        </svg>
        <span class="auth-modal-brand-name">LifeLink</span>
      </div>

      <!-- Auth Mode Tabs -->
      <div class="auth-modal-tabs">
        <button type="button" class="auth-tab-btn active" id="tab-login-btn">Login</button>
        <button type="button" class="auth-tab-btn" id="tab-signup-btn">Sign Up</button>
      </div>

      <div class="auth-error-banner hidden" id="modal-auth-error"></div>

      <!-- Login Form -->
      <form id="modal-login-form" class="auth-form-content">
        <div class="auth-modal-header" style="text-align:left; margin-bottom:20px;">
          <h2 class="auth-modal-title" id="auth-modal-title">Welcome back</h2>
          <p class="auth-modal-subtitle">Login to continue with LifeLink.</p>
        </div>

        <div class="input-group">
          <label class="input-label" for="modal-login-phone">Mobile Number</label>
          <div class="input-phone">
            <span class="input-prefix">+91</span>
            <input type="tel" id="modal-login-phone" class="input" placeholder="9876543210" maxlength="10" autocomplete="tel">
          </div>
        </div>

        <div class="input-group">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <label class="input-label" for="modal-login-password" style="margin:0;">Password</label>
            <button type="button" class="auth-link-btn" id="link-modal-forgot" style="font-size:12.5px;">Forgot Password?</button>
          </div>
          <div class="input-password-wrapper">
            <input type="password" id="modal-login-password" class="input" placeholder="Enter your password" autocomplete="current-password">
            <button type="button" class="toggle-password-btn" data-target="modal-login-password" aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-open"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-closed" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn--auth" id="btn-modal-login">Login</button>

        <div class="auth-divider">or</div>
        <div class="auth-switch-row">
          Don't have an account? <button type="button" class="auth-link-btn" id="link-modal-to-signup">Sign Up</button>
        </div>
      </form>

      <!-- Sign Up Form -->
      <form id="modal-signup-form" class="auth-form-content hidden">
        <div class="auth-modal-header" style="text-align:left; margin-bottom:20px;">
          <h2 class="auth-modal-title">Create your LifeLink account</h2>
          <p class="auth-modal-subtitle">Join LifeLink and be there when someone needs help.</p>
        </div>

        <div class="input-group">
          <label class="input-label" for="modal-reg-phone">Mobile Number</label>
          <div class="input-phone">
            <span class="input-prefix">+91</span>
            <input type="tel" id="modal-reg-phone" class="input" placeholder="9876543210" maxlength="10" autocomplete="tel">
          </div>
        </div>

        <div class="input-group">
          <label class="input-label" for="modal-reg-password">Password</label>
          <div class="input-password-wrapper">
            <input type="password" id="modal-reg-password" class="input" placeholder="Enter your password" autocomplete="new-password">
            <button type="button" class="toggle-password-btn" data-target="modal-reg-password" aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-open"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-closed" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          <p class="password-req-hint">At least 8 characters</p>
        </div>

        <div class="input-group">
          <label class="input-label" for="modal-reg-confirm">Confirm Password</label>
          <div class="input-password-wrapper">
            <input type="password" id="modal-reg-confirm" class="input" placeholder="Re-enter your password" autocomplete="new-password">
            <button type="button" class="toggle-password-btn" data-target="modal-reg-confirm" aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-open"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon eye-closed" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn--auth" id="btn-modal-signup">Create Account</button>

        <div class="auth-divider">or</div>
        <div class="auth-switch-row">
          Already have an account? <button type="button" class="auth-link-btn" id="link-modal-to-login">Login</button>
        </div>
      </form>

      <!-- Forgot Password Form -->
      <form id="modal-forgot-form" class="auth-form-content hidden">
        <div class="auth-modal-header" style="text-align:left; margin-bottom:20px;">
          <h2 class="auth-modal-title">Reset your password</h2>
          <p class="auth-modal-subtitle">Enter your mobile number and we'll send reset instructions.</p>
        </div>

        <div class="input-group">
          <label class="input-label" for="modal-forgot-phone">Mobile Number</label>
          <div class="input-phone">
            <span class="input-prefix">+91</span>
            <input type="tel" id="modal-forgot-phone" class="input" placeholder="9876543210" maxlength="10" autocomplete="tel">
          </div>
        </div>

        <button type="submit" class="btn--auth" id="btn-modal-reset">Reset Password</button>

        <div class="auth-divider">or</div>
        <div class="auth-switch-row">
          <button type="button" class="auth-link-btn" id="link-modal-back-login">← Back to Login</button>
        </div>
      </form>

    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  attachAuthModalEvents();
}

function attachAuthModalEvents() {
  const modal = document.getElementById('global-auth-modal');
  const closeBtn = document.getElementById('btn-close-auth-modal');
  const tabLogin = document.getElementById('tab-login-btn');
  const tabSignup = document.getElementById('tab-signup-btn');
  const loginForm = document.getElementById('modal-login-form');
  const signupForm = document.getElementById('modal-signup-form');
  const forgotForm = document.getElementById('modal-forgot-form');

  closeBtn.addEventListener('click', closeAuthModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal();
  });

  // Password toggles — swap eye SVG icons
  modal.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  // Tab Switching
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    clearModalError();
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    clearModalError();
  });

  document.getElementById('link-modal-forgot').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotForm.classList.remove('hidden');
    clearModalError();
  });

  document.getElementById('link-modal-back-login').addEventListener('click', () => {
    forgotForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    clearModalError();
  });

  // In-form switch links
  const toSignupLink = document.getElementById('link-modal-to-signup');
  if (toSignupLink) {
    toSignupLink.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      forgotForm.classList.add('hidden');
      clearModalError();
    });
  }

  const toLoginLink = document.getElementById('link-modal-to-login');
  if (toLoginLink) {
    toLoginLink.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      forgotForm.classList.add('hidden');
      clearModalError();
    });
  }

  // Submit Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError();
    const btn = document.getElementById('btn-modal-login');
    const phone = document.getElementById('modal-login-phone').value.trim();
    const password = document.getElementById('modal-login-password').value;

    if (!phone || phone.length < 10) {
      showModalError(AUTH_ERRORS.INVALID_PHONE);
      return;
    }
    if (!password || password.length < 8) {
      showModalError(AUTH_ERRORS.PASSWORD_SHORT);
      return;
    }

    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="btn-spinner"></span>Logging in...';

    try {
      const user = await loginUser({ phoneDigits: phone, password: password });
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Login';
      closeAuthModal();
      if (pendingAuthCallback) {
        pendingAuthCallback(user, pendingActionIntent);
      }
    } catch (err) {
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Login';
      showModalError(err.message || AUTH_ERRORS.WRONG_CREDENTIALS);
    }
  });

  // Submit Sign Up
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError();
    const btn = document.getElementById('btn-modal-signup');
    const phone = document.getElementById('modal-reg-phone').value.trim();
    const password = document.getElementById('modal-reg-password').value;
    const confirmPassword = document.getElementById('modal-reg-confirm').value;

    if (!phone || phone.length < 10) {
      showModalError(AUTH_ERRORS.INVALID_PHONE);
      return;
    }
    if (!password || password.length < 8) {
      showModalError(AUTH_ERRORS.PASSWORD_SHORT);
      return;
    }
    if (password !== confirmPassword) {
      showModalError(AUTH_ERRORS.PASSWORD_MISMATCH);
      return;
    }

    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="btn-spinner"></span>Creating account...';

    try {
      const user = await registerUser({ phoneDigits: phone, password: password });
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Create Account';
      closeAuthModal();
      if (pendingAuthCallback) {
        pendingAuthCallback(user, pendingActionIntent);
      }
    } catch (err) {
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Create Account';
      showModalError(err.message || AUTH_ERRORS.CREATE_FAILED);
    }
  });

  // Submit Reset
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError();
    const btn = document.getElementById('btn-modal-reset');
    const phone = document.getElementById('modal-forgot-phone').value.trim();

    if (!phone || phone.length < 10) {
      showModalError(AUTH_ERRORS.INVALID_PHONE);
      return;
    }

    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="btn-spinner"></span>Sending...';

    try {
      await resetPassword(phone);
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Reset Password';
      const banner = document.getElementById('modal-auth-error');
      banner.className = 'auth-success-banner';
      banner.textContent = 'Password reset instructions sent to your mobile number.';
    } catch (err) {
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Reset Password';
      showModalError(err.message || AUTH_ERRORS.NETWORK_ERROR);
    }
  });
}

function showModalError(msg) {
  const banner = document.getElementById('modal-auth-error');
  if (banner) {
    banner.style.backgroundColor = '#FDEDEC';
    banner.style.borderColor = '#FADBD8';
    banner.style.color = '#A93226';
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

function clearModalError() {
  const banner = document.getElementById('modal-auth-error');
  if (banner) {
    banner.textContent = '';
    banner.classList.add('hidden');
  }
}

function openAuthModal(callback, actionIntent = null) {
  initAuthModal();
  pendingAuthCallback = callback;
  pendingActionIntent = actionIntent;
  clearModalError();
  const modal = document.getElementById('global-auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('global-auth-modal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', initAuthModal);
