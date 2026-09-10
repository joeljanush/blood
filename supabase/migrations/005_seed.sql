-- ============================================================
-- LifeLink Blood Donation System
-- Migration 005: Fictional Test / Seed Data
-- Run AFTER 004_functions.sql
-- ============================================================
-- ALL DATA IS FICTIONAL. No real people or locations.
-- Safe for development and testing only.
-- ============================================================

-- Temporarily bypass RLS for seeding (run as service_role in Supabase)
SET LOCAL role = 'postgres';

-- ============================================================
-- HOSPITALS (Tamil Nadu — fictional names, real-ish coordinates)
-- ============================================================
INSERT INTO public.hospitals (id, name, city, address, latitude, longitude, phone, is_verified)
VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    'LifeLink General Hospital',
    'Chennai',
    '14, Anna Salai, Teynampet, Chennai - 600018',
    13.0418900,
    80.2341200,
    '+91-44-12345678',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'Kovai Blood Centre & Hospital',
    'Coimbatore',
    '87, Avinashi Road, Peelamedu, Coimbatore - 641004',
    11.0234500,
    76.9787600,
    '+91-422-9876543',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'Meenakshi Medical Trust',
    'Madurai',
    '22, Bypass Road, Mattuthavani, Madurai - 625007',
    9.9195400,
    78.1193200,
    '+91-452-2345678',
    true
  );


-- ============================================================
-- USERS (fictional — auth_id set to NULL for seed data)
-- In production, auth_id is populated after Supabase Auth sign-up
-- ============================================================
INSERT INTO public.users (id, auth_id, phone, email, role, is_active)
VALUES
  -- Donors
  ('22222222-0000-0000-0000-000000000001', NULL, '+919876500001', 'donor1.test@lifelink.dev', 'donor',         true),
  ('22222222-0000-0000-0000-000000000002', NULL, '+919876500002', 'donor2.test@lifelink.dev', 'donor',         true),
  ('22222222-0000-0000-0000-000000000003', NULL, '+919876500003', 'donor3.test@lifelink.dev', 'donor',         true),
  ('22222222-0000-0000-0000-000000000004', NULL, '+919876500004', 'donor4.test@lifelink.dev', 'donor',         true),
  ('22222222-0000-0000-0000-000000000005', NULL, '+919876500005', 'donor5.test@lifelink.dev', 'donor',         true),
  -- Patient
  ('22222222-0000-0000-0000-000000000006', NULL, '+919876500006', 'patient1.test@lifelink.dev', 'patient',     true),
  -- Hospital staff
  ('22222222-0000-0000-0000-000000000007', NULL, '+919876500007', 'staff1.test@lifelink.dev', 'hospital_staff', true),
  ('22222222-0000-0000-0000-000000000008', NULL, '+919876500008', 'staff2.test@lifelink.dev', 'hospital_staff', true),
  -- Admin
  ('22222222-0000-0000-0000-000000000009', NULL, '+919876500009', 'admin.test@lifelink.dev',  'admin',          true);


-- ============================================================
-- DONORS (fictional names, areas in Tamil Nadu)
-- ============================================================
INSERT INTO public.donors (
  id, user_id, full_name, age, gender, blood_group,
  city, area, latitude, longitude,
  is_available, last_donation_date, verification_status
)
VALUES
  (
    '33333333-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'Arun Kumar S',
    28, 'male', 'O+',
    'Chennai', 'Adyar',
    13.0012300, 80.2562400,
    true, '2026-03-15', 'verified'
  ),
  (
    '33333333-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000002',
    'Priya Rajan',
    24, 'female', 'A+',
    'Chennai', 'Velachery',
    12.9816500, 80.2208700,
    true, NULL, 'verified'
  ),
  (
    '33333333-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000003',
    'Mohammed Farhan',
    32, 'male', 'B+',
    'Chennai', 'Tambaram',
    12.9249100, 80.1000000,
    false, '2026-01-20', 'verified'
  ),
  (
    '33333333-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000004',
    'Lakshmi Devi R',
    29, 'female', 'AB+',
    'Coimbatore', 'RS Puram',
    11.0131700,  76.9558100,
    true, '2025-11-10', 'verified'
  ),
  (
    '33333333-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000005',
    'Senthil Nathan',
    36, 'male', 'O-',
    'Madurai', 'Anna Nagar',
    9.9344900, 78.1218200,
    true, NULL, 'pending'
  );


-- ============================================================
-- PATIENT (fictional)
-- ============================================================
INSERT INTO public.patients (
  id, user_id, full_name, age, gender,
  attendant_name, attendant_phone
)
VALUES (
  '44444444-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000006',
  'Kavitha Suresh',
  45, 'female',
  'Suresh Kumar', '+919876500010'
);


-- ============================================================
-- HOSPITAL STAFF (fictional)
-- ============================================================
INSERT INTO public.hospital_staff (
  id, user_id, hospital_id, position, is_verified
)
VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000007',
    '11111111-0000-0000-0000-000000000001',
    'Blood Bank Technician',
    true
  ),
  (
    '55555555-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000008',
    '11111111-0000-0000-0000-000000000002',
    'Senior Blood Bank Officer',
    true
  );


-- ============================================================
-- BLOOD REQUESTS (sample — one emergency, one normal)
-- ============================================================
INSERT INTO public.blood_requests (
  id, patient_id, hospital_id, blood_group,
  units_required, urgency, status,
  expires_at
)
VALUES
  (
    '66666666-0000-0000-0000-000000000001',
    '44444444-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'O+', 2, 'emergency', 'searching',
    NOW() + INTERVAL '24 hours'
  ),
  (
    '66666666-0000-0000-0000-000000000002',
    '44444444-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    'A+', 1, 'normal', 'donor_found',
    NOW() + INTERVAL '72 hours'
  );


-- ============================================================
-- DONOR RESPONSES (sample)
-- ============================================================
INSERT INTO public.donor_responses (
  id, request_id, donor_id, response, responded_at
)
VALUES
  (
    '77777777-0000-0000-0000-000000000001',
    '66666666-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    'pending', NULL
  ),
  (
    '77777777-0000-0000-0000-000000000002',
    '66666666-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000002',
    'accepted', NOW() - INTERVAL '2 hours'
  );


-- ============================================================
-- DONATION (sample — pending confirmation by staff)
-- Status is NOT auto-set; it must be confirmed by hospital staff
-- ============================================================
INSERT INTO public.donations (
  id, request_id, donor_id, hospital_id,
  blood_group, units, donation_date,
  status, confirmed_by
)
VALUES (
  '88888888-0000-0000-0000-000000000001',
  '66666666-0000-0000-0000-000000000002',
  '33333333-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000002',
  'A+', 1, CURRENT_DATE,
  'pending', NULL
  -- confirmed_by will be set by hospital staff after physical screening
);


-- ============================================================
-- NOTIFICATIONS (sample)
-- ============================================================
INSERT INTO public.notifications (
  id, user_id, request_id, title, message, type, is_read
)
VALUES
  (
    '99999999-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    '66666666-0000-0000-0000-000000000001',
    'Urgent Blood Request Nearby',
    'A patient at LifeLink General Hospital needs O+ blood urgently. You are 2.3 km away.',
    'blood_request', false
  ),
  (
    '99999999-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000006',
    '66666666-0000-0000-0000-000000000002',
    'Donor Found',
    'A compatible donor has accepted your blood request. Please visit Kovai Blood Centre.',
    'request_update', false
  );


-- ============================================================
-- VERIFICATION SUMMARY (informational — not assertions)
-- ============================================================
-- Expected row counts after seed:
--   hospitals      → 3
--   users          → 9
--   donors         → 5
--   patients       → 1
--   hospital_staff → 2
--   blood_requests → 2
--   donor_responses→ 2
--   donations      → 1
--   notifications  → 2
--
-- To verify, run in Supabase SQL editor:
--   SELECT 'hospitals'       AS t, COUNT(*) FROM public.hospitals
--   UNION ALL
--   SELECT 'users',               COUNT(*) FROM public.users
--   UNION ALL
--   SELECT 'donors',              COUNT(*) FROM public.donors
--   UNION ALL
--   SELECT 'patients',            COUNT(*) FROM public.patients
--   UNION ALL
--   SELECT 'hospital_staff',      COUNT(*) FROM public.hospital_staff
--   UNION ALL
--   SELECT 'blood_requests',      COUNT(*) FROM public.blood_requests
--   UNION ALL
--   SELECT 'donor_responses',     COUNT(*) FROM public.donor_responses
--   UNION ALL
--   SELECT 'donations',           COUNT(*) FROM public.donations
--   UNION ALL
--   SELECT 'notifications',       COUNT(*) FROM public.notifications;
