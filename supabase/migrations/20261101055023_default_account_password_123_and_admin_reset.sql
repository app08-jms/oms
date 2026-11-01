/*
# Default account password 123 and admin password reset

1. Modified Functions
- `create_app_user`: the minimum password length drops from 6 to 3 so the default password "123" is accepted. Creating an account for an employee now also sets that employee's has-account flag to true.
- `change_app_user_password` is NOT changed: a user choosing their own password still needs at least 6 characters.

2. New Functions
- `reset_app_user_password(p_token, p_system_uid)`: resets an account's password to "123".
  - Super Admin can reset any account.
  - Hotel Admin can reset only accounts that are not Super Admin or Hotel Admin and that share at least one hotel with them.

3. Security
- The new function checks the caller's session token on every call and raises an error for unauthorized callers.
- Both functions run as SECURITY DEFINER with a fixed search path.
- EXECUTE is revoked from PUBLIC and granted to anon and authenticated, matching the other account functions. Access control is enforced inside the function by the session token.
*/

CREATE OR REPLACE FUNCTION public.create_app_user(p_token text, p_username text, p_password text, p_full_name text, p_role text, p_hotel_id uuid, p_employee_system_uid text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
v_caller public.app_users%ROWTYPE;
v_uid text;
BEGIN
SELECT * INTO v_caller FROM public.app_session_user(p_token);
IF v_caller.system_uid IS NULL OR v_caller.role NOT IN ('super_admin', 'admin') THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;

IF v_caller.role = 'admin' THEN
IF p_role IN ('super_admin', 'admin') THEN
RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
END IF;
IF NOT EXISTS (
SELECT 1 FROM public.app_user_hotels
WHERE app_user_system_uid = v_caller.system_uid AND hotel_id = p_hotel_id
) THEN
RAISE EXCEPTION 'forbidden_hotel' USING ERRCODE = '42501';
END IF;
END IF;

IF p_username IS NULL OR p_username !~ '^[A-Za-z0-9._-]{3,30}$' THEN
RAISE EXCEPTION 'invalid_username' USING ERRCODE = '22023';
END IF;
IF p_password IS NULL OR length(p_password) < 3 THEN
RAISE EXCEPTION 'weak_password' USING ERRCODE = '22023';
END IF;
IF trim(coalesce(p_full_name, '')) = '' THEN
RAISE EXCEPTION 'invalid_full_name' USING ERRCODE = '22023';
END IF;
IF NOT EXISTS (SELECT 1 FROM public.roles WHERE key = p_role) THEN
RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
END IF;
IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = p_hotel_id) THEN
RAISE EXCEPTION 'invalid_hotel' USING ERRCODE = '22023';
END IF;
IF EXISTS (SELECT 1 FROM public.app_users WHERE username = trim(p_username)) THEN
RAISE EXCEPTION 'username_taken' USING ERRCODE = '23505';
END IF;
IF p_employee_system_uid IS NOT NULL AND EXISTS (
SELECT 1 FROM public.app_users WHERE employee_system_uid = p_employee_system_uid
) THEN
RAISE EXCEPTION 'employee_linked' USING ERRCODE = '23505';
END IF;

INSERT INTO public.app_users (username, full_name, role, password_hash, employee_system_uid)
VALUES (
trim(p_username),
trim(p_full_name),
p_role,
extensions.crypt(p_password, extensions.gen_salt('bf')),
p_employee_system_uid
)
RETURNING system_uid INTO v_uid;

INSERT INTO public.app_user_hotels (app_user_system_uid, hotel_id) VALUES (v_uid, p_hotel_id);

IF p_employee_system_uid IS NOT NULL THEN
UPDATE public.employees SET has_account = true WHERE system_uid = p_employee_system_uid;
END IF;

RETURN v_uid;
END
$function$;

REVOKE EXECUTE ON FUNCTION public.create_app_user(text, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, text, text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reset_app_user_password(p_token text, p_system_uid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
v_caller public.app_users%ROWTYPE;
v_target public.app_users%ROWTYPE;
BEGIN
SELECT * INTO v_caller FROM public.app_session_user(p_token);
IF v_caller.system_uid IS NULL OR v_caller.role NOT IN ('super_admin', 'admin') THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;

SELECT * INTO v_target FROM public.app_users WHERE system_uid = p_system_uid;
IF v_target.system_uid IS NULL THEN
RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
END IF;

IF v_caller.role = 'admin' THEN
IF v_target.role IN ('super_admin', 'admin') THEN
RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
END IF;
IF NOT EXISTS (
SELECT 1
FROM public.app_user_hotels caller_hotel
JOIN public.app_user_hotels target_hotel ON target_hotel.hotel_id = caller_hotel.hotel_id
WHERE caller_hotel.app_user_system_uid = v_caller.system_uid
AND target_hotel.app_user_system_uid = v_target.system_uid
) THEN
RAISE EXCEPTION 'forbidden_hotel' USING ERRCODE = '42501';
END IF;
END IF;

UPDATE public.app_users
SET password_hash = extensions.crypt('123', extensions.gen_salt('bf'))
WHERE system_uid = v_target.system_uid;
END
$function$;

REVOKE EXECUTE ON FUNCTION public.reset_app_user_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_app_user_password(text, text) TO anon, authenticated;
