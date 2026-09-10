-- ============================================================
-- LifeLink Blood Donation System
-- Migration 002: Tables, Constraints & Indexes
-- Run AFTER 001_extensions.sql
-- ============================================================

-- ============================================================
-- HELPER: auto-update updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


"-- ============================================================
-- TABLE 1: users
-- Mirrors auth.users — stores phone and account metadata
-- users.id = auth.users.id
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);


-- ============================================================
-- TABLE 2: hospitals
-- Reference location for donor matching (patient never needs to enter coords)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT NOT NULL,
  latitude    NUMERIC(10, 7) NOT NULL,
  longitude   NUMERIC(10, 7) NOT NULL,
  phone       TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_hospitals_city        ON public.hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_is_verified ON public.hospitals(is_verified);


-- ============================================================
-- TABLE 3: donors
-- Location used ONLY for matching — never exposed to patients
-- verification_status is set by admin/staff, NOT auto-computed
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  age                 INTEGER NOT NULL CHECK (age >= 18 AND age <= 65),
  gender              TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group         TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  city                TEXT NOT NULL,
  area                TEXT NOT NULL,
  latitude            NUMERIC(10, 7),
  longitude           NUMERIC(10, 7),
  is_available        BOOLEAN NOT NULL DEFAULT false,
  last_donation_date  DATE,
  -- 'pending' | 'verified' | 'rejected'  — set only by authorized staff
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_donors_updated_at
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_donors_blood_group          ON public.donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_is_available         ON public.donors(is_available);
CREATE INDEX IF NOT EXISTS idx_donors_verification_status  ON public.donors(verification_status);
CREATE INDEX IF NOT EXISTS idx_donors_city                 ON public.donors(city);
CREATE INDEX IF NOT EXISTS idx_donors_user_id              ON public.donors(user_id);


-- ============================================================
-- TABLE 4: patients
-- Minimal info only — no unnecessary medical data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  age              INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
  gender           TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  attendant_name   TEXT NOT NULL,
  attendant_phone  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);


-- ============================================================
-- TABLE 5: hospital_staff
-- Only verified staff can confirm donations or update screening
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_staff (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hospital_id  UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  position     TEXT NOT NULL,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_staff_user_id     ON public.hospital_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_staff_hospital_id ON public.hospital_staff(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_staff_is_verified ON public.hospital_staff(is_verified);


-- ============================================================
-- TABLE 6: blood_requests
-- Core workflow table — status drives the entire donation flow
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  hospital_id     UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  blood_group     TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_required  INTEGER NOT NULL CHECK (units_required > 0),
  urgency         TEXT NOT NULL CHECK (urgency IN ('emergency', 'urgent', 'normal')),
  -- Full status lifecycle
  status          TEXT NOT NULL DEFAULT 'searching'
                  CHECK (status IN (
                    'searching',
                    'donor_found',
                    'screening',
                    'donation_confirmed',
                    'completed',
                    'cancelled',
                    'expired'
                  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_blood_requests_status      ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency     ON public.blood_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital_id ON public.blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_patient_id  ON public.blood_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_expires_at  ON public.blood_requests(expires_at);


-- ============================================================
-- TABLE 7: donor_responses
-- Tracks each donor's response to a blood request
-- UNIQUE constraint prevents duplicate responses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donor_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id      UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  response      TEXT NOT NULL DEFAULT 'pending'
                CHECK (response IN ('pending', 'accepted', 'declined')),
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One donor, one response per request
  UNIQUE (request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_donor_responses_request_id ON public.donor_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_responses_donor_id   ON public.donor_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_responses_response   ON public.donor_responses(response);


-- ============================================================
-- TABLE 8: donations
-- Final donation record — confirmed ONLY by verified hospital staff
-- status is set by staff, NOT auto-computed from donor registration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id     UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE RESTRICT,
  donor_id       UUID NOT NULL REFERENCES public.donors(id) ON DELETE RESTRICT,
  hospital_id    UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  blood_group    TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units          INTEGER NOT NULL CHECK (units > 0),
  donation_date  DATE NOT NULL,
  -- 'pending' | 'completed' | 'not_completed'
  -- Only authorized hospital staff may set this
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'not_completed')),
  confirmed_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_donations_request_id ON public.donations(request_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id   ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_hospital_id ON public.donations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_donations_status      ON public.donations(status);


-- ============================================================
-- TABLE 9: notifications
-- In-app notification system for all user roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_id  UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'blood_request',
                'request_update',
                'screening_update',
                'donation_confirmed',
                'system'
              )),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_request_id ON public.notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON public.notifications(type);
