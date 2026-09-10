"// ===== LifeLink Unified Authentication & Profile Management System =====

const AUTH_ERRORS = {
  WRONG_CREDENTIALS: 'Phone number or password is incorrect.',
  INVALID_PHONE: 'Please enter a valid mobile number.',
  ALREADY_REGISTERED: 'This mobile number is already registered.',
  PASSWORD_SHORT: 'Password must contain at least 8 characters.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  CREATE_FAILED: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Something went wrong. Please try again.',
};

/**
 * Validates a 10-digit mobile number
 */
function validatePhone(phone) {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
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
  const formattedPhoneNumber = `+91${digits}`;
  const authEmail = phoneToAuthEmail(digits);

  let authUser = null;

  if (client && client.auth) {
    // 1. Try native phone + password signup first
    let res = await client.auth.signUp({
      phone: formattedPhoneNumber,
      password: password,
      options: {
        data: { phone: formattedPhoneNumber }
      }
    });

    // 2. If phone SMS provider is not enabled in Supabase Dashboard, fallback to phone-backed auth identifier
    if (res.error && (
      res.error.message.includes('SMS provider') ||
      res.error.message.includes('Phone provider') ||
      res.error.message.includes('not enabled') ||
      res.error.status === 400
    )) {
      res = await client.auth.signUp({
        email: authEmail,
        password: password,
        options: {
          data: { phone: formattedPhoneNumber }
        }
      });
    }

    if (res.error) {
      const msg = res.error.message || '';
      if (msg.includes('already registered') || msg.includes('already exists') || res.error.status === 422) {
        throw new Error(AUTH_ERRORS.ALREADY_REGISTERED);
      }
      if (msg.includes('FetchError') || msg.includes('Failed to fetch')) {
        throw new Error(AUTH_ERRORS.NETWORK_ERROR);
      }
      throw new Error(AUTH_ERRORS.CREATE_FAILED);
    }

    authUser = res.data?.user;
  }

  const userId = authUser?.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'usr_' + Date.now());

  const profile = {
    id: userId,
    phone: formattedPhoneNumber,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert into public.users table (users.id = Supabase Auth user.id)
  if (client && authUser) {
    try {
      await client.from('users').upsert({
        id: userId,
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
  const formattedPhoneNumber = `+91${digits}`;
  const authEmail = phoneToAuthEmail(digits);

  let authUser = null;

  if (client && client.auth) {
    // 1. Try native phone + password login first
    let res = await client.auth.signInWithPassword({
      phone: formattedPhoneNumber,
      password: password
    });

    // 2. Fallback to phone-backed auth identifier if phone auth provider is disabled
    if (res.error && (
      res.error.message.includes('SMS provider') ||
      res.error.message.includes('Phone provider') ||
      res.error.message.includes('Invalid login credentials') ||
      res.error.status === 400
    )) {
      const fallbackRes = await client.auth.signInWithPassword({
        email: authEmail,
        password: password
      });
      if (!fallbackRes.error) {
        res = fallbackRes;
      }
    }

    if (res.error) {
      const msg = res.error.message || '';
      if (msg.includes('FetchError') || msg.includes('Failed to fetch')) {
        throw new Error(AUTH_ERRORS.NETWORK_ERROR);
      }
      throw new Error(AUTH_ERRORS.WRONG_CREDENTIALS);
    }

    authUser = res.data?.user;
  }

  const userId = authUser?.id || 'usr_' + digits;
  const profile = {
    id: userId,
    phone: formattedPhoneNumber,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Maintain public.users record
  if (client && authUser) {
    try {
      await client.from('users').upsert({
        id: userId,
        phone: formattedPhoneNumber,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Public users record login sync note:', e);
    }
  }

  saveSession({ user: profile, sessionToken: 'token_' + userId });
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

  if (client && client.auth) {
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

async function getPatientProfileAsync(userId) {
  const local = getPatientProfile(userId);
  const client = getSupabase();
  if (client && userId) {
    try {
      const { data, error } = await client.from('patients').select('*').eq('user_id', userId).maybeSingle();
      if (!error && data) {
        localStorage.setItem(`lifelink_patient_profile_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (e) {}
  }
  return local;
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

async function getDonorProfileAsync(userId) {
  const local = getDonorProfile(userId);
  const client = getSupabase();
  if (client && userId) {
    try {
      const { data, error } = await client.from('donors').select('*').eq('user_id', userId).maybeSingle();
      if (!error && data) {
        localStorage.setItem(`lifelink_donor_profile_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (e) {}
  }
  return local;
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
 * Session storage & listener helpers
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
}

async function logoutUser() {
  const client = getSupabase();
  if (client && client.auth) {
    try {
      await client.auth.signOut();
    } catch (e) {}
  }
  clearSession();
  window.location.href = 'index.html';
}

/**
 * Listen for Supabase auth state changes
 */
function setupSupabaseAuthListener() {
  const client = getSupabase();
  if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session && session.user) {
          const formattedPhone = session.user.phone || session.user.user_metadata?.phone || `+91${session.user.email?.replace('@phone.lifelink.app', '').replace('91', '')}`;
          const profile = {
            id: session.user.id,
            phone: formattedPhone,
            is_active: true
          };
          saveSession({ user: profile, sessionToken: session.access_token });
        }
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      }
    });
  }
}

// Auto-run listener setup
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSupabaseAuthListener);
} else {
  setupSupabaseAuthListener();
}
"
