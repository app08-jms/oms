/*
# Store workday totals when payroll is locked

## Plain-English summary
The monthly closing summary now records each employee's total workdays, calculated by adding up the work multiplier of every completed shift. A shift with multiplier 2.0 counts as 2.0 workdays. The lock step saves this total so the locked report stays fixed.

## Changes
1. `payroll_locked_summaries` gets `work_days` numeric(6,2), NOT NULL, default 0. Existing locked rows keep 0 (they were locked before this metric existed).
2. `lock_payroll_period` now reads `work_days` from the submitted rows. Missing values are stored as 0.

## Security
- The function keeps its existing signature, SECURITY DEFINER setting and grants. No policy changes.

## Important notes
1. Logic for the lock checks (already locked, pending adjustments) is unchanged.
2. Multipliers are resolved on the client from the schedule and shift catalog before the lock request is sent.
*/

ALTER TABLE payroll_locked_summaries ADD COLUMN IF NOT EXISTS work_days numeric(6,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.lock_payroll_period(p_period text, p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_status text;
BEGIN
SELECT status INTO v_status FROM payroll_periods WHERE period_month = p_period FOR UPDATE;
IF v_status = 'locked' THEN
RAISE EXCEPTION 'Kỳ chốt công này đã khóa dữ liệu' USING ERRCODE = 'P0001';
END IF;

IF EXISTS (
SELECT 1 FROM payroll_adjustments
WHERE status = 'pending' AND to_char(work_date, 'YYYY-MM') = p_period
) THEN
RAISE EXCEPTION 'Còn đề xuất điều chỉnh chưa duyệt trong kỳ này';
END IF;

INSERT INTO payroll_periods (period_month, status, locked_at)
VALUES (p_period, 'locked', now())
ON CONFLICT (period_month) DO UPDATE SET status = 'locked', locked_at = now();

INSERT INTO payroll_locked_summaries (
period_month, employee_code, full_name, department, credited_hours, ot_hours, off_days, p_days, up_days, work_days
)
SELECT p_period, r.employee_code, r.full_name, r.department, r.credited_hours, r.ot_hours, r.off_days, r.p_days, r.up_days, COALESCE(r.work_days, 0)
FROM jsonb_to_recordset(p_rows) AS r(
employee_code text,
full_name text,
department text,
credited_hours numeric,
ot_hours numeric,
off_days integer,
p_days integer,
up_days integer,
work_days numeric
);

INSERT INTO payroll_audit_log (period_month, action, detail)
VALUES (p_period, 'period_locked', 'Khóa dữ liệu chốt công kỳ ' || p_period);
END;
$function$;
