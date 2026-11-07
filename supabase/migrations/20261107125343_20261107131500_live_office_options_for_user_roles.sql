/*
# Use live office assignments in user role management

1. Purpose
- Make the office selector in “Utenti e Ruoli” use the current CAF office records only.
- Replace copied or outdated office names shown from historical staff profile text.

2. New function
- `public.admin_list_staff_office_assignments()` returns each staff member's id, current linked office id, and current office name.
- The result is based on `account_workspaces.office_id` joined to `caf_offices`, so office renames appear immediately.

3. Security
- The function is `SECURITY DEFINER` with a fixed `public` search path.
- It returns rows only when the caller is an authenticated administrator.
- Execute is revoked from `PUBLIC` and `anon`, and granted only to `authenticated`.
- No table RLS policies or direct table privileges are broadened.

4. Data safety
- No office or user records are changed or deleted.
- The function is read-only and only exposes office assignment data needed by the administrator role screen.
*/

CREATE OR REPLACE FUNCTION public.admin_list_staff_office_assignments()
RETURNS TABLE(staff_id uuid, office_id uuid, office_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    staff.id,
    office.id,
    office.name
  FROM public.staff_members AS staff
  JOIN public.account_workspaces AS workspace ON workspace.staff_id = staff.id
  JOIN public.caf_offices AS office ON office.id = workspace.office_id
  WHERE public.is_current_user_admin();
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_staff_office_assignments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_staff_office_assignments() TO authenticated;