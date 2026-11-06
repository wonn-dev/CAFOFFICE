/*
# Include the office payment permission in the authenticated staff context

1. New function
- `public.get_current_staff_context_with_permission()` returns the signed-in
  user's role, staff details, assigned office, and that office's
  `can_pay_later` permission.
- The office is resolved through `account_workspaces` and `caf_offices`, so the
  browser cannot select a different office or permission value.

2. Security
- The function is `SECURITY DEFINER` with a fixed `public` search path.
- It identifies the current user only with `auth.uid()`.
- Anonymous and public execution are revoked; signed-in users may call it.
- Existing functions, rows, and RLS policies are unchanged.
*/

CREATE OR REPLACE FUNCTION public.get_current_staff_context_with_permission()
RETURNS TABLE(
  role text,
  staff_name text,
  office text,
  office_id uuid,
  status text,
  can_pay_later boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    staff.role,
    staff.name,
    staff.office,
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
