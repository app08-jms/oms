/*
# Add identity, residence, and hotel link to employee profiles

Plain-English summary: each employee profile now stores citizen ID details and permanent address, and every profile belongs to one hotel. The browser role can now also create and edit employee profiles, which the existing policies already allowed but the grants did not.

## 1. Modified table: employees
- citizen_id (text, optional): citizen ID number (CCCD / CMND).
- citizen_id_issued_date (date, optional): date the ID was issued.
- citizen_id_issued_place (text, optional): place the ID was issued.
- permanent_address (text, optional): permanent residence address.
- hotel_id (uuid, required, references hotels.id): the hotel the employee works at. The table is empty at the time of this migration, so the NOT NULL constraint is applied without a backfill.

## 2. Indexes
- employees_hotel_id_idx on hotel_id for per-hotel lookups.

## 3. Security
- Grants INSERT and UPDATE on employees to anon and authenticated. The existing row policies for these verbs already target both roles; the missing grants caused permission errors on save.
- No policies are changed. Row access is still governed by the existing policies.

## Important notes
1. Statements are idempotent (IF NOT EXISTS / re-runnable), so re-applying is safe.
2. No columns are dropped or retyped.
*/

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS citizen_id text,
  ADD COLUMN IF NOT EXISTS citizen_id_issued_date date,
  ADD COLUMN IF NOT EXISTS citizen_id_issued_place text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE RESTRICT;

ALTER TABLE employees ALTER COLUMN hotel_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS employees_hotel_id_idx ON employees (hotel_id);

GRANT INSERT, UPDATE ON employees TO anon, authenticated;
