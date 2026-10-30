/*
# Add employee-to-account back-link kept in sync by trigger

1. Plain-English summary
- Each employee profile now records which app account is linked to it.
- Linking or unlinking an account in User Management updates both sides in the same database transaction, so the two can never disagree.

2. Modified tables
- `employees`: new nullable column `app_user_system_uid` (text). Indexed for lookups.

3. Triggers
- `app_users` AFTER INSERT / UPDATE OF employee_system_uid / DELETE runs `sync_employee_back_link()`, which clears the old employee's back-link and sets the new one.

4. Backfill
- Existing links are copied from `app_users.employee_system_uid` into `employees.app_user_system_uid`.

5. Security
- The trigger function runs with definer rights only to update the back-link column; it is not callable by API roles.
- No new table grants are needed; the column inherits the existing table privileges.
*/

ALTER TABLE employees ADD COLUMN IF NOT EXISTS app_user_system_uid text;

CREATE INDEX IF NOT EXISTS employees_app_user_system_uid_idx ON employees (app_user_system_uid);

UPDATE employees e
SET app_user_system_uid = u.system_uid
FROM app_users u
WHERE u.employee_system_uid = e.system_uid
  AND e.app_user_system_uid IS DISTINCT FROM u.system_uid;

CREATE OR REPLACE FUNCTION public.sync_employee_back_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE employees SET app_user_system_uid = NULL WHERE app_user_system_uid = OLD.system_uid;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.employee_system_uid IS NOT NULL
     AND OLD.employee_system_uid IS DISTINCT FROM NEW.employee_system_uid THEN
    UPDATE employees
    SET app_user_system_uid = NULL
    WHERE system_uid = OLD.employee_system_uid
      AND app_user_system_uid = NEW.system_uid;
  END IF;

  IF NEW.employee_system_uid IS NOT NULL THEN
    UPDATE employees
    SET app_user_system_uid = NEW.system_uid
    WHERE system_uid = NEW.employee_system_uid;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_employee_back_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS app_users_sync_employee_back_link ON app_users;
CREATE TRIGGER app_users_sync_employee_back_link
AFTER INSERT OR UPDATE OF employee_system_uid OR DELETE ON app_users
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_back_link();
