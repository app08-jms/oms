/*
# Let Hotel Admin create any non-elevated role, including custom roles

1. Account creation rule (create_app_user)
- Super Admin: may create any role in any hotel.
- Hotel Admin: may create any role except Super Admin and Hotel Admin. This covers Manager, Staff, and custom roles created on the roles page.
- Hotel Admin remains limited to hotels assigned to them.
- Other checks (username, password, full name, role must exist in the roles table, hotel must exist, username and employee link uniqueness) are unchanged.

2. Security
- The function is redefined with the same signature and grants; no table data changes.
*/

CREATE OR REPLACE FUNCTION public.create_app_user(
  p_token text,
  p_username text,
  p_password text,
  p_full_name text,
  p_role text,
  p_hotel_id uuid,
  p_employee_system_uid text
)
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
  IF p_password IS NULL OR length(p_password) < 6 THEN
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

  RETURN v_uid;
END
$function$;
