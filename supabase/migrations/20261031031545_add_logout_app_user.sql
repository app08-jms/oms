/*
# Add logout_app_user RPC

1. New Function
- `logout_app_user(p_token text) -> boolean`: deletes the server-side session that matches the given token, so a signed-out token can no longer be used.

2. Security
- SECURITY DEFINER so the browser never needs direct access to `app_sessions`.
- Only the token hash is compared; the raw token is never stored.
- EXECUTE revoked from PUBLIC and granted to anon and authenticated, matching the other public auth RPCs.

3. Notes
- Returns false when no matching session exists (already logged out or expired); callers may ignore the result.
*/

CREATE OR REPLACE FUNCTION public.logout_app_user(p_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
WITH deleted AS (
  DELETE FROM public.app_sessions
  WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  RETURNING 1
)
SELECT EXISTS (SELECT 1 FROM deleted);
$function$;

REVOKE EXECUTE ON FUNCTION public.logout_app_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.logout_app_user(text) TO anon, authenticated;
