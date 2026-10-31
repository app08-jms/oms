/*
# Custom username login with hashed passwords (RPC based)

1. Plain-English summary
- Accounts now sign in with an internal username and password stored as a one-way hash.
- The browser never reads password hashes. Login, account creation and password change all run as database functions.
- Login returns a session token; only a hash of that token is stored.
- The existing Super Admin account keeps its current password (its bcrypt hash is copied from the auth record).

2. New objects
- app_users.password_hash (text): bcrypt hash of the account password.
- app_sessions: one row per login session (token hash, owner, expiry). No client access.
- login_app_user(username, password): returns { ok, token, account } on success, { ok: false } otherwise.
- create_app_user(token, username, password, full_name, role, hotel_id, employee_system_uid): creates an account and links it to one hotel.
- change_app_user_password(token, current, next): changes the caller's own password.
- app_session_user(token): internal lookup of the active account behind a token.

3. Security changes
- Column-level SELECT on app_users for anon and authenticated, excluding password_hash.
- app_sessions has RLS enabled and no client grants.
- Functions are callable only by anon/authenticated for the three public RPCs; the internal lookup is not callable by clients.
- Super Admin can create accounts for any hotel and role. Hotel Admin can create accounts only for hotels they are linked to, and cannot create Super Admin accounts.

4. Notes
- Statements are idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS style).
- Existing Supabase Auth accounts are left in place; the app no longer signs in through them.
*/

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS password_hash text;

UPDATE public.app_users u
SET password_hash = a.encrypted_password::text
FROM auth.users a
WHERE a.id = u.auth_user_id
  AND u.password_hash IS NULL;

CREATE TABLE IF NOT EXISTS public.app_sessions (
  token_hash text PRIMARY KEY,
  app_user_system_uid text NOT NULL REFERENCES public.app_users(system_uid) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_sessions FROM anon, authenticated;

REVOKE SELECT ON public.app_users FROM anon, authenticated;
GRANT SELECT (id, system_uid, username, full_name, role, is_active, employee_system_uid, auth_user_id, created_at)
  ON public.app_users TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.app_session_user(p_token text)
RETURNS public.app_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.*
  FROM public.app_sessions s
  JOIN public.app_users u ON u.system_uid = s.app_user_system_uid
  WHERE s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    AND s.expires_at > now()
    AND u.is_active
$$;

CREATE OR REPLACE FUNCTION public.login_app_user(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user public.app_users%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_user FROM public.app_users WHERE username = trim(p_username) AND is_active;
  IF NOT FOUND OR v_user.password_hash IS NULL
     OR v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.app_sessions (token_hash, app_user_system_uid, expires_at)
  VALUES (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_user.system_uid, now() + interval '1 hour');

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'account', jsonb_build_object(
      'systemUid', v_user.system_uid,
      'username', v_user.username,
      'fullName', v_user.full_name,
      'roleKey', v_user.role,
      'employeeSystemUid', v_user.employee_system_uid
    )
  );
END
$$;

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
SET search_path = public, extensions
AS $$
DECLARE
  v_caller public.app_users%ROWTYPE;
  v_uid text;
BEGIN
  SELECT * INTO v_caller FROM public.app_session_user(p_token);
  IF v_caller.system_uid IS NULL OR v_caller.role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF v_caller.role = 'admin' THEN
    IF p_role = 'super_admin' THEN
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
$$;

CREATE OR REPLACE FUNCTION public.change_app_user_password(p_token text, p_current text, p_next text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller public.app_users%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM public.app_session_user(p_token);
  IF v_caller.system_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF v_caller.password_hash <> extensions.crypt(p_current, v_caller.password_hash) THEN
    RETURN false;
  END IF;
  IF p_next IS NULL OR length(p_next) < 6 THEN
    RAISE EXCEPTION 'weak_password' USING ERRCODE = '22023';
  END IF;
  UPDATE public.app_users
  SET password_hash = extensions.crypt(p_next, extensions.gen_salt('bf'))
  WHERE system_uid = v_caller.system_uid;
  RETURN true;
END
$$;

REVOKE EXECUTE ON FUNCTION public.app_session_user(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_app_user(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_app_user(text, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_app_user_password(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_app_user(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, text, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_app_user_password(text, text, text) TO anon, authenticated;
