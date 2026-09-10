-- ============================================================
-- LifeLink Blood Donation System
-- Migration 004: Helper Functions & Triggers
-- Run AFTER 003_rls.sql
-- ============================================================


-- ============================================================
-- FUNCTION: find_nearby_donors
-- Finds available, verified donors matching blood group,
-- sorted by distance from the selected hospital.
-- NEVER returns exact lat/lon to callers — only distances.
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_nearby_donors(
  p_hospital_id  UUID,
  p_blood_group  TEXT,
  p_radius_km    FLOAT DEFAULT 50.0
)
RETURNS TABLE (
  donor_id             UUID,
  full_name            TEXT,
  blood_group          TEXT,
  city                 TEXT,
  area                 TEXT,
  is_available         BOOLEAN,
  verification_status  TEXT,
  last_donation_date   DATE,
  distance_km          FLOAT,
  distance_label       TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_hosp_lat  NUMERIC(10,7);
  v_hosp_lon  NUMERIC(10,7);
BEGIN
  -- Get hospital coordinates
  SELECT latitude, longitude
  INTO v_hosp_lat, v_hosp_lon
  FROM public.hospitals
  WHERE id = p_hospital_id AND is_verified = true;

  IF v_hosp_lat IS NULL THEN
    RAISE EXCEPTION 'Hospital not found or not verified: %', p_hospital_id;
  END IF;

  RETURN QUERY
  SELECT
    d.id                                                         AS donor_id,
    d.full_name                                                  AS full_name,
    d.blood_group                                                AS blood_group,
    d.city                                                       AS city,
    d.area                                                       AS area,
    d.is_available                                               AS is_available,
    d.verification_status                                        AS verification_status,
    d.last_donation_date                                         AS last_donation_date,
    -- Distance in km using PostGIS (haversine via geography type)
    ROUND(
      ST_Distance(
        ST_Point(d.longitude, d.latitude)::geography,
        ST_Point(v_hosp_lon, v_hosp_lat)::geography
      ) / 1000.0
    , 1)::FLOAT                                                  AS distance_km,
    -- Human-readable label — exact coordinates are NEVER returned
    ROUND(
      ST_Distance(
        ST_Point(d.longitude, d.latitude)::geography,
        ST_Point(v_hosp_lon, v_hosp_lat)::geography
      ) / 1000.0
    , 1)::TEXT || ' km from hospital'                            AS distance_label
  FROM public.donors d
  WHERE
    d.blood_group         = p_blood_group
    AND d.is_available    = true
    AND d.verification_status = 'verified'
    AND d.latitude        IS NOT NULL
    AND d.longitude       IS NOT NULL
    AND ST_Distance(
          ST_Point(d.longitude, d.latitude)::geography,
          ST_Point(v_hosp_lon, v_hosp_lat)::geography
        ) / 1000.0 <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;


-- ============================================================
-- FUNCTION: get_approximate_distance
-- Returns a human-readable distance string for a single donor.
-- Safe to call from frontend — no raw coordinates returned.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_approximate_distance(
  p_donor_id    UUID,
  p_hospital_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_donor_lat   NUMERIC(10,7);
  v_donor_lon   NUMERIC(10,7);
  v_hosp_lat    NUMERIC(10,7);
  v_hosp_lon    NUMERIC(10,7);
  v_distance_km FLOAT;
BEGIN
  SELECT latitude, longitude INTO v_donor_lat, v_donor_lon
  FROM public.donors WHERE id = p_donor_id;

  SELECT latitude, longitude INTO v_hosp_lat, v_hosp_lon
  FROM public.hospitals WHERE id = p_hospital_id AND is_verified = true;

  IF v_donor_lat IS NULL OR v_hosp_lat IS NULL THEN
    RETURN 'Distance unavailable';
  END IF;

  v_distance_km := ROUND(
    ST_Distance(
      ST_Point(v_donor_lon, v_donor_lat)::geography,
      ST_Point(v_hosp_lon, v_hosp_lat)::geography
    ) / 1000.0
  , 1);

  RETURN v_distance_km::TEXT || ' km from hospital';
END;
$$;


-- ============================================================
-- FUNCTION: expire_old_requests
-- Marks blood requests as 'expired' when their expires_at
-- timestamp has passed and they are still in 'searching' status.
-- Call this via Supabase pg_cron or an Edge Function scheduler.
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_old_requests()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.blood_requests
  SET status = 'expired'
  WHERE status = 'searching'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================================
-- FUNCTION: notify_user
-- Internal helper — inserts a notification for a user.
-- Should be called from server-side triggers or Edge Functions,
-- not directly from the frontend.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id    UUID,
  p_request_id UUID,
  p_title      TEXT,
  p_message    TEXT,
  p_type       TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, request_id, title, message, type)
  VALUES (p_user_id, p_request_id, p_title, p_message, p_type)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


-- ============================================================
-- TRIGGER: auto-update donor's last_donation_date
-- When a donation is marked 'completed', update the donor's
-- last_donation_date automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_donor_last_donation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.donors
    SET last_donation_date = NEW.donation_date
    WHERE id = NEW.donor_id
      AND (last_donation_date IS NULL OR last_donation_date < NEW.donation_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_donor_last_donation
  AFTER UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_donor_last_donation();


-- ============================================================
-- TRIGGER: auto-update blood_request status when donor accepts
-- When a donor_response changes to 'accepted', move the
-- linked blood_request to 'donor_found' if still 'searching'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_request_on_donor_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.response = 'accepted' AND OLD.response != 'accepted' THEN
    UPDATE public.blood_requests
    SET status = 'donor_found'
    WHERE id = NEW.request_id
      AND status = 'searching';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_request_on_donor_accept
  AFTER UPDATE ON public.donor_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_request_on_donor_accept();


-- ============================================================
-- TRIGGER: set responded_at when donor responds
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.response IN ('accepted', 'declined') AND OLD.response = 'pending' THEN
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_responded_at
  BEFORE UPDATE ON public.donor_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_responded_at();
