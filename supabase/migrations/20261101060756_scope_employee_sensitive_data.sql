/*
# Scope employee personal data behind a session-checked RPC

1. Summary
- Employee identity data (Citizen ID number, issued date, issued place, permanent address) can no longer be read directly from the `employees` table with the public API key.
- Full employee profiles are now read through `list_employee_profiles(p_token, p_hotel_id)`, which checks the caller's login session and limits rows by role.

2. New function
- `list_employee_profiles(p_token text, p_hotel_id uuid default null)` returns the employee rows the caller may see:
  - `super_admin`: every hotel (optionally filtered by `p_hotel_id`).
  - `staff`: only the employee record linked to their own account.
  - Any other role (Hotel Admin, Manager, custom roles): employees in hotels linked to their account in `app_user_hotels`.
- A missing or expired session raises an `unauthorized` error (42501).
- SECURITY DEFINER with a fixed search_path. EXECUTE is granted to `anon` and `authenticated` because the app calls it with the session token, not a Supabase Auth login.

3. Modified table grants (`employees`)
- Table-wide SELECT is revoked from `anon` and `authenticated`.
- SELECT is granted again on every column except `citizen_id`, `citizen_id_issued_date`, `citizen_id_issued_place` and `permanent_address`.
- INSERT and UPDATE grants and the existing row policies are unchanged, so create, edit and import keep working.

4. Security notes
- Row Level Security stays enabled on `employees`.
- The sensitive columns are readable only through the RPC, which runs as the table owner and applies the role rules above.
- Non-sensitive columns (code, name, department, hotel, status, etc.) remain readable by the public key because other modules (attendance, schedule, settings, accounts) rely on them.

5. Important notes
- Applying this grant change without the RPC would break the employee profile page, so the app code switches to the RPC in the same release.
- Re-running this migration is safe: the function uses CREATE OR REPLACE and the grant changes are idempotent.
*/

CREATE OR REPLACE FUNCTION public.list_employee_profiles(p_token text, p_hotel_id uuid DEFAULT NULL)
RETURNS SETOF public.employees
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller public.app_users%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM public.app_session_user(p_token);
  IF v_caller.system_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.*
  FROM public.employees e
  WHERE (p_hotel_id IS NULL OR e.hotel_id = p_hotel_id)
    AND (
      v_caller.role = 'super_admin'
      OR (v_caller.role = 'staff' AND e.app_user_system_uid = v_caller.system_uid)
      OR (
        v_caller.role <> 'staff'
        AND EXISTS (
          SELECT 1
          FROM public.app_user_hotels h
          WHERE h.app_user_system_uid = v_caller.system_uid
            AND h.hotel_id = e.hotel_id
        )
      )
    )
  ORDER BY e.code;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_employee_profiles(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_employee_profiles(text, uuid) TO anon, authenticated;

REVOKE SELECT ON public.employees FROM anon, authenticated;
GRANT SELECT (
  system_uid, code, full_name, display_name, department, position, probation_date, official_date,
  employment_status, phone, email, has_account, app_user_system_uid, leave_tracking,
  initial_leave_days, hotel_id, auth_user_id, created_at
) ON public.employees TO anon, authenticated;
