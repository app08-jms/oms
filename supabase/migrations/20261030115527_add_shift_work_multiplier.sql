/*
# Add work multiplier (he_so_cong) to shift types

## Plain-English summary
Each shift type now carries a work multiplier that decides how many workdays a completed shift is worth.
Standard shifts count as 1.0; half-days count as 0.5; overtime or holiday shifts can count as 1.5, 2.0 or 3.0; off days count as 0.

## Changes
1. `shift_types` gets a new column `he_so_cong`:
   - numeric(3,1), NOT NULL, default 1.0 (existing shift types become standard 1.0 shifts).
   - CHECK constraint restricts values to 0, 0.5, 1.0, 1.5, 2.0, 3.0.

## Security
- No new tables, policies or grants. The column is covered by the existing table-level privileges on `shift_types`.

## Important notes
1. `shift_types` is a shared catalog today (it has no hotel column), so the multiplier applies to every hotel that uses that shift code.
2. Existing rows are not deleted or altered beyond receiving the default value.
*/

ALTER TABLE shift_types ADD COLUMN IF NOT EXISTS he_so_cong numeric(3,1) NOT NULL DEFAULT 1.0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_types_he_so_cong_check' AND conrelid = 'shift_types'::regclass
  ) THEN
    ALTER TABLE shift_types
      ADD CONSTRAINT shift_types_he_so_cong_check CHECK (he_so_cong IN (0, 0.5, 1.0, 1.5, 2.0, 3.0));
  END IF;
END $$;
