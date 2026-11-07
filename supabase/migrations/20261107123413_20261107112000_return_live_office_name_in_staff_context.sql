/*
# Return the live CAF office name in authenticated staff context

1. Purpose
- Ensure operators and administrators see the current CAF office name after an administrator renames the office.
- Keep the existing authenticated workspace and staff relationships unchanged.

2. Modified function
- `public.get_current_staff_context_with_permission()` now returns `caf_offices.name` through its existing office relationship instead of the copied `staff_members.office` text.
- The function signature, role information, office id, status, and payment permission behavior remain unchanged.

3. Security
- The function remains `SECURITY DEFINER` with `search_path` fixed to `public`.
- It continues to return only the context belonging to `auth.uid()` through `account_workspaces`.
- No grants or RLS policies are loosened or changed.

4. Data safety
- No rows are deleted, recreated, or migrated.
- The historical copied staff office text remains untouched; the live linked office name is used for display.
*/

CREATE OR REPLACE FUNCTION public.get_current_staff_context_with_permission()
RETURNS TABLE(role text, staff_name text, office text, office_id uuid, status text, can_pay_later boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    staff.role,
    staff.name,
    COALESCE(office.name, staff.office),
    workspace.office_id,
    staff.status,
    COALESCE(office.can_pay_later, false)
  FROM public.account_workspaces AS workspace
  JOIN public.staff_members AS staff ON staff.id = workspace.staff_id
  LEFT JOIN public.caf_offices AS office ON office.id = workspace.office_id
  WHERE workspace.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_staff_context_with_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_context_with_permission() TO authenticated;