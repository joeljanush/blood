-- ============================================================
-- LifeLink Blood Donation System
-- Migration 003: Row Level Security (RLS) Policies
-- Run AFTER 002_tables.sql
-- ============================================================

-- ============================================================
-- Enable RLS on all user-facing tables
-- ============================================================
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_staff  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get current user's internal users.id from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- HELPER: Get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- HELPER: Check if current user is verified hospital staff for a given hospital
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_verified_staff_for_hospital(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_staff hs
    JOIN public.users u ON u.id = hs.user_id
    WHERE u.auth_id = auth.uid()
      AND hs.hospital_id = p_hospital_id
      AND hs.is_verified = true
  );
$$;


-- ============================================================
-- TABLE: users
-- ============================================================

-- Admins can do everything
CREATE POLICY "admin_all_users" ON public.users
  FOR ALL USING (get_my_role() = 'admin');

-- Users can view and update their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid());

-- New users can insert their own record (during sign-up)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());


-- ============================================================
-- TABLE: donors
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_donors" ON public.donors
  FOR ALL USING (get_my_role() = 'admin');

-- Donors: read and update ONLY their own profile
CREATE POLICY "donor_select_own" ON public.donors
  FOR SELECT USING (user_id = get_my_user_id());

CREATE POLICY "donor_update_own" ON public.donors
  FOR UPDATE USING (user_id = get_my_user_id());

CREATE POLICY "donor_insert_own" ON public.donors
  FOR INSERT WITH CHECK (user_id = get_my_user_id());

-- Hospital staff (verified): can view donors who have responded to their hospital's requests
CREATE POLICY "staff_select_responding_donors" ON public.donors
  FOR SELECT USING (
    get_my_role() = 'hospital_staff'
    AND EXISTS (
      SELECT 1
      FROM public.donor_responses dr
      JOIN public.blood_requests br ON br.id = dr.request_id
      WHERE dr.donor_id = donors.id
        AND is_verified_staff_for_hospital(br.hospital_id)
    )
  );


-- ============================================================
-- TABLE: patients
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_patients" ON public.patients
  FOR ALL USING (get_my_role() = 'admin');

-- Patients: own profile only
CREATE POLICY "patient_select_own" ON public.patients
  FOR SELECT USING (user_id = get_my_user_id());

CREATE POLICY "patient_update_own" ON public.patients
  FOR UPDATE USING (user_id = get_my_user_id());

CREATE POLICY "patient_insert_own" ON public.patients
  FOR INSERT WITH CHECK (user_id = get_my_user_id());

-- Hospital staff: can view patients whose requests belong to their hospital
CREATE POLICY "staff_select_patients" ON public.patients
  FOR SELECT USING (
    get_my_role() = 'hospital_staff'
    AND EXISTS (
      SELECT 1
      FROM public.blood_requests br
      WHERE br.patient_id = patients.id
        AND is_verified_staff_for_hospital(br.hospital_id)
    )
  );


-- ============================================================
-- TABLE: hospitals
-- ============================================================

-- Everyone (including anonymous) can read verified hospitals
-- (needed so patients and donors can browse hospitals when creating a request)
CREATE POLICY "public_select_verified_hospitals" ON public.hospitals
  FOR SELECT USING (is_verified = true);

-- Admins: full access
CREATE POLICY "admin_all_hospitals" ON public.hospitals
  FOR ALL USING (get_my_role() = 'admin');

-- Verified staff can update their own hospital record
CREATE POLICY "staff_update_own_hospital" ON public.hospitals
  FOR UPDATE USING (is_verified_staff_for_hospital(id));


-- ============================================================
-- TABLE: hospital_staff
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_hospital_staff" ON public.hospital_staff
  FOR ALL USING (get_my_role() = 'admin');

-- Staff: view their own record
CREATE POLICY "staff_select_own" ON public.hospital_staff
  FOR SELECT USING (user_id = get_my_user_id());

-- Staff: insert their own record (pending verification by admin)
CREATE POLICY "staff_insert_own" ON public.hospital_staff
  FOR INSERT WITH CHECK (user_id = get_my_user_id());


-- ============================================================
-- TABLE: blood_requests
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_blood_requests" ON public.blood_requests
  FOR ALL USING (get_my_role() = 'admin');

-- Patients: create and view their own requests
CREATE POLICY "patient_insert_request" ON public.blood_requests
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = get_my_user_id()
    )
  );

CREATE POLICY "patient_select_own_requests" ON public.blood_requests
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = get_my_user_id()
    )
  );

-- Patients: cancel their own requests (update status to 'cancelled')
CREATE POLICY "patient_cancel_own_request" ON public.blood_requests
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = get_my_user_id()
    )
  );

-- Donors: view requests they have been notified about (via donor_responses)
CREATE POLICY "donor_select_assigned_requests" ON public.blood_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.donor_responses dr
      JOIN public.donors d ON d.id = dr.donor_id
      WHERE dr.request_id = blood_requests.id
        AND d.user_id = get_my_user_id()
    )
  );

-- Hospital staff (verified): view and update requests at their hospital
CREATE POLICY "staff_select_hospital_requests" ON public.blood_requests
  FOR SELECT USING (is_verified_staff_for_hospital(hospital_id));

CREATE POLICY "staff_update_hospital_requests" ON public.blood_requests
  FOR UPDATE USING (is_verified_staff_for_hospital(hospital_id));


-- ============================================================
-- TABLE: donor_responses
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_donor_responses" ON public.donor_responses
  FOR ALL USING (get_my_role() = 'admin');

-- Donors: view and update (accept/decline) their own responses
CREATE POLICY "donor_select_own_responses" ON public.donor_responses
  FOR SELECT USING (
    donor_id IN (SELECT id FROM public.donors WHERE user_id = get_my_user_id())
  );

CREATE POLICY "donor_update_own_response" ON public.donor_responses
  FOR UPDATE USING (
    donor_id IN (SELECT id FROM public.donors WHERE user_id = get_my_user_id())
  );

CREATE POLICY "donor_insert_own_response" ON public.donor_responses
  FOR INSERT WITH CHECK (
    donor_id IN (SELECT id FROM public.donors WHERE user_id = get_my_user_id())
  );

-- Patients: view responses to their own requests (limited — no donor phone/location)
CREATE POLICY "patient_select_own_request_responses" ON public.donor_responses
  FOR SELECT USING (
    request_id IN (
      SELECT br.id FROM public.blood_requests br
      JOIN public.patients p ON p.id = br.patient_id
      WHERE p.user_id = get_my_user_id()
    )
  );

-- Hospital staff: view responses for their hospital's requests
CREATE POLICY "staff_select_responses" ON public.donor_responses
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.blood_requests
      WHERE is_verified_staff_for_hospital(hospital_id)
    )
  );

-- Hospital staff: insert donor responses on behalf of workflow (e.g. assigning donors)
CREATE POLICY "staff_insert_responses" ON public.donor_responses
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT id FROM public.blood_requests
      WHERE is_verified_staff_for_hospital(hospital_id)
    )
  );


-- ============================================================
-- TABLE: donations
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_donations" ON public.donations
  FOR ALL USING (get_my_role() = 'admin');

-- Hospital staff (verified): insert and update donations at their hospital
-- NOTE: Donors CANNOT confirm their own donation
CREATE POLICY "staff_insert_donation" ON public.donations
  FOR INSERT WITH CHECK (is_verified_staff_for_hospital(hospital_id));

CREATE POLICY "staff_update_donation" ON public.donations
  FOR UPDATE USING (is_verified_staff_for_hospital(hospital_id));

CREATE POLICY "staff_select_donations" ON public.donations
  FOR SELECT USING (is_verified_staff_for_hospital(hospital_id));

-- Donors: view their own donation history
CREATE POLICY "donor_select_own_donations" ON public.donations
  FOR SELECT USING (
    donor_id IN (SELECT id FROM public.donors WHERE user_id = get_my_user_id())
  );

-- Patients: view donations related to their own requests
CREATE POLICY "patient_select_own_donations" ON public.donations
  FOR SELECT USING (
    request_id IN (
      SELECT br.id FROM public.blood_requests br
      JOIN public.patients p ON p.id = br.patient_id
      WHERE p.user_id = get_my_user_id()
    )
  );


-- ============================================================
-- TABLE: notifications
-- ============================================================

-- Admins: full access
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (get_my_role() = 'admin');

-- Users: can only see their own notifications
CREATE POLICY "user_select_own_notifications" ON public.notifications
  FOR SELECT USING (user_id = get_my_user_id());

-- Users: can mark their own notifications as read
CREATE POLICY "user_update_own_notifications" ON public.notifications
  FOR UPDATE USING (user_id = get_my_user_id());

-- System/admin inserts notifications (no direct user insert)
CREATE POLICY "admin_insert_notifications" ON public.notifications
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
