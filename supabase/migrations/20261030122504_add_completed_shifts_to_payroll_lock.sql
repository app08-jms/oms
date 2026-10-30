/*
# Store completed shift count in payroll lock snapshots

1. Modified Tables
- `payroll_locked_summaries`: new column `completed_shifts` (integer, default 0). Records how many shifts each employee completed (check-in and check-out both present) in the locked month.

2. Modified Functions
- `lock_payroll_period`: now reads `completed_shifts` from the snapshot rows and saves it. All other behaviour is unchanged.

3. Security
- No change to RLS, policies, or grants. The function keeps its existing SECURITY DEFINER setting and search path.

4. Notes
- Existing locked periods keep the default value 0, because their shift counts were never recorded.
*/

ALTER TABLE payroll_locked_summaries ADD COLUMN IF NOT EXISTS completed_shifts integer NOT NULL DEFAULT 0;

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
period_month, employee_code, full_name, department, credited_hours, ot_hours, off_days, p_days, up_days, work_days, completed_shifts
)
SELECT p_period, r.employee_code, r.full_name, r.department, r.credited_hours, r.ot_hours, r.off_days, r.p_days, r.up_days, COALESCE(r.work_days, 0), COALESCE(r.completed_shifts, 0)
FROM jsonb_to_recordset(p_rows) AS r(
employee_code text,
full_name text,
department text,
credited_hours numeric,
ot_hours numeric,
off_days integer,
p_days integer,
up_days integer,
work_days numeric,
completed_shifts integer
);

INSERT INTO payroll_audit_log (period_month, action, detail)
VALUES (p_period, 'period_locked', 'Khóa dữ liệu chốt công kỳ ' || p_period);
END;
$function$;
