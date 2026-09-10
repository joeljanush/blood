// ===== LifeLink Unified Authentication & Profile Management System =====

const AUTH_ERRORS = {
  WRONG_CREDENTIALS: 'Phone number or password is incorrect.',
  INVALID_PHONE: 'Please enter a valid mobile number.',
  PASSWORD_SHORT: 'Password must contain at least 8 characters.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  CREATE_FAILED: "We couldn't create your account. Please try again.",
  NETWORK_ERROR: 'Something went wrong. Please check your internet connection.',
};

/**
 * Validates a 10-digit mobile number
 */
function validatePhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10 ? clean : null;
}

/**
 * Converts a 10-digit mobile number to an internal email identifier for Supabase Auth fallback
 */
function phoneToAuthEmail(digits) {
  return `91${digits}@phone.lifelink.app`;
}

/**
 * Normalizes phone display format
 */
function formatPhone(digits) {
  return `+91 ${digits}`;
}

/**
 * Register a new user (Single account - NO role assigned at registration)
 */
async function registerUser({ phoneDigits, password }) {
  const digits = validatePhone(phoneDigits);
  if (!digits) {
    throw new Error(AUTH_ERRORS.INVALID_PHONE);
  }
  if (!password || password.length < 8) {
    throw new Error(AUTH_ERRORS.PASSWORD_SHORT);
  }

  const client = getSupabase();
  const authEmail = phoneToAuthEmail(digits);
  const formattedPhoneNumber = `+91${digits}`;

  let authUser = null;

  if (client) {
    try {
      let { data, error } = await client.auth.signUp({
        email: authEmail,
        password: password,
        options: {
          data: { phone: formattedPhoneNumber }
        }
      });

      if (error) {
        if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          throw new Error(AUTH_ERRORS.NETWORK_ERROR);
        }
        console.warn('Supabase Auth note:', error.message);
      }

      authUser = data?.user;
    } catch (err) {
      if (err.message === AUTH_ERRORS.NETWORK_ERROR) throw err;
      console.warn('Supabase sign-up note:', err);
    }
  }

  const userId = authUser?.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'usr_' + Date.now());

  const profile = {
    id: userId,
    phone: formattedPhoneNumber,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert into public.users table
  if (client && authUser) {
    try {
      await client.from('users').upsert({
        id: userId,
        auth_id: userId,
        phone: formattedPhoneNumber,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Public users record insert note:', e);
    }
  }

  saveSession({ user: profile, sessionToken: 'token_' + userId });
  return profile;
}

/**
 * Login existing user
 */
async function loginUser({ phoneDigits, password }) {
  const digits = validatePhone(phoneDigits);
  if (!digits) {
    throw new Error(AUTH_ERRORS.INVALID_PHONE);
  }
  if (!password || password.length < 8) {
    throw new Error(AUTH_ERRORS.PASSWORD_SHORT);
  }

  const client = getSupabase();
  const authEmail = phoneToAuthEmail(digits);
  const formattedPhoneNumber = `+91${digits}`;

  let authUser = null;

  if (client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: authEmail,
        password: password
      });

      if (error) {
        if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          throw new Error(AUTH_ERRORS.NETWORK_ERROR);
        }
        throw new Error(AUTH_ERRORS.WRONG_CREDENTIALS);
      }

      authUser = data.user;
    } catch (err) {
      if (err.message === AUTH_ERRORS.NETWORK_ERROR || err.message === AUTH_ERRORS.WRONG_CREDENTIALS) {
        throw err;
      }
      console.warn('Supabase sign-in note:', err);
    }
  }

  const storedSession = getStoredSession();
  if (storedSession && storedSession.user && storedSession.user.phone === formattedPhoneNumber) {
    saveSession(storedSession);
    return storedSession.user;
  }

  const profile = {
    id: authUser?.id || 'usr_' + digits,
    phone: formattedPhoneNumber,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  saveSession({ user: profile, sessionToken: 'token_' + profile.id });
  return profile;
}

/**
 * Reset Password
 */
async function resetPassword(phoneDigits) {
  const digits = validatePhone(phoneDigits);
  if (!digits) {
    throw new Error(AUTH_ERRORS.INVALID_PHONE);
  }

  const client = getSupabase();
  const authEmail = phoneToAuthEmail(digits);

  if (client) {
    try {
      const { error } = await client.auth.resetPasswordForEmail(authEmail);
      if (error && (error.message.includes('FetchError') || error.message.includes('Failed to fetch'))) {
        throw new Error(AUTH_ERRORS.NETWORK_ERROR);
      }
    } catch (err) {
      if (err.message === AUTH_ERRORS.NETWORK_ERROR) throw err;
      console.warn('Reset password note:', err);
    }
  }

  return true;
}

/**
 * Profile helpers for Patient and Donor
 */
function getPatientProfile(userId) {
  try {
    const raw = localStorage.getItem(`lifelink_patient_profile_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function savePatientProfile(userId, patientData) {
  const data = { ...patientData, user_id: userId, updated_at: new Date().toISOString() };
  localStorage.setItem(`lifelink_patient_profile_${userId}`, JSON.stringify(data));
  
  const client = getSupabase();
  if (client) {
    client.from('patients').upsert(data, { onConflict: 'user_id' }).then().catch(() => {});
  }
  return data;
}

function getDonorProfile(userId) {
  try {
    const raw = localStorage.getItem(`lifelink_donor_profile_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveDonorProfile(userId, donorData) {
  const data = { ...donorData, user_id: userId, updated_at: new Date().toISOString() };
  localStorage.setItem(`lifelink_donor_profile_${userId}`, JSON.stringify(data));

  const client = getSupabase();
  if (client) {
    client.from('donors').upsert(data, { onConflict: 'user_id' }).then().catch(() => {});
  }
  return data;
}

/**
 * Session storage helpers
 */
function saveSession(sessionData) {
  localStorage.setItem('lifelink_session', JSON.stringify(sessionData));
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem('lifelink_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('lifelink_session');
  const client = getSupabase();
  if (client) {
    client.auth.signOut().catch(() => {});
  }
}

function logoutUser() {
  clearSession();
  window.location.href = 'index.html';
}
