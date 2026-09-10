# LifeLink — Supabase Backend Setup

## Overview

This directory contains PostgreSQL migration scripts for the LifeLink blood donation platform backend hosted on **Supabase**.

## Prerequisites

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and note your:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public key**
   - **service_role key** (keep secret — never expose in frontend)

## How to Apply Migrations

Run each SQL file **in order** in the Supabase SQL Editor:

1. Go to your Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Paste the contents of each file and click **Run**

### Migration Order

| # | File | Description |
|---|------|-------------|
| 1 | `migrations/001_extensions.sql` | Enable `uuid-ossp` + `postgis` |
| 2 | `migrations/002_tables.sql` | Create all 9 tables, constraints, indexes |
| 3 | `migrations/003_rls.sql` | Row Level Security policies for all roles |
| 4 | `migrations/004_functions.sql` | Nearby donor matching, triggers, helpers |
| 5 | `migrations/005_seed.sql` | Fictional test data (Tamil Nadu) |

> ⚠️ **Run them in order.** Each file depends on the previous ones.

## Database Structure

```
auth.users (Supabase Auth — handles passwords/sessions)
    └── users (profile table)
            ├── donors
            ├── patients
            └── hospital_staff

hospitals
    ├── hospital_staff
    ├── blood_requests
    └── donations

patients
    └── blood_requests

blood_requests
    ├── donor_responses
    ├── donations
    └── notifications
```

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Common account info — linked to Supabase Auth |
| `donors` | Donor profiles, blood group, location |
| `patients` | Patient profiles with attendant info |
| `hospitals` | Hospital locations (reference for donor matching) |
| `hospital_staff` | Links staff to hospitals |
| `blood_requests` | Patient blood requests with status lifecycle |
| `donor_responses` | Donor accept/decline per request |
| `donations` | Confirmed donation records |
| `notifications` | In-app notification system |

## Key Functions

| Function | Purpose |
|----------|---------|
| `find_nearby_donors(hospital_id, blood_group, radius_km)` | Find available donors near a hospital |
| `get_approximate_distance(donor_id, hospital_id)` | Get human-readable distance string |
| `expire_old_requests()` | Mark expired requests (call via scheduler) |
| `notify_user(...)` | Create notification for a user |

## Test Data

The seed file includes fictional data for:
- 3 hospitals in Tamil Nadu (Chennai, Coimbatore, Madurai)
- 5 donors with different blood groups
- 1 patient
- 2 hospital staff members
- 2 blood requests
- Sample responses and donations

## Verification

After running all migrations, verify with:

```sql
SELECT 'hospitals'       AS t, COUNT(*) FROM public.hospitals
UNION ALL
SELECT 'users',               COUNT(*) FROM public.users
UNION ALL
SELECT 'donors',              COUNT(*) FROM public.donors
UNION ALL
SELECT 'patients',            COUNT(*) FROM public.patients
UNION ALL
SELECT 'hospital_staff',      COUNT(*) FROM public.hospital_staff
UNION ALL
SELECT 'blood_requests',      COUNT(*) FROM public.blood_requests
UNION ALL
SELECT 'donor_responses',     COUNT(*) FROM public.donor_responses
UNION ALL
SELECT 'donations',           COUNT(*) FROM public.donations
UNION ALL
SELECT 'notifications',       COUNT(*) FROM public.notifications;
```

## Next Steps

1. Configure Supabase Auth (phone + password)
2. Connect existing frontend pages to Supabase client
3. Implement patient → blood request → donor matching flow
