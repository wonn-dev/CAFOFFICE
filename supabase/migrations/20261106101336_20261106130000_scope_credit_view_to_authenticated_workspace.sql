/*
# Scope operator credit pages to the authenticated workspace office

## Purpose
The operator credit screen must use the office assigned to the signed-in
account, not the first office returned by a general list query. This prevents
an operator assigned to CAF OFFICE TIBURTINA from seeing another office such
as CAF Centro Milano.

## Database changes
1. Replace `get_current_staff_context()` with a return shape that includes
   `office_id`, alongside the existing role, staff name, office name, and
   status values.
2. Keep the function server-resolved from `account_workspaces`, so the client
   cannot choose or override the office identity.

## Security
- The function remains SECURITY DEFINER with a fixed public search path.
- Execution remains restricted to authenticated users.
- Existing office-scoped RLS policies on credit balances, requests, and
  transactions remain the enforcement layer for data access.
- No data is deleted or reassigned.
*/

DROP FUNCTION IF EXISTS public.get_current_staff_context();

CREATE FUNCTION public.get_current_staff_context()
RETURNS TABLE (role text, staff_name text, office text, office_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT staff.role, staff.name, staff.office, workspace.office_id, staff.status
  FROM public.account_workspaces AS workspace
  JOIN public.staff_members AS staff ON staff.id = workspace.staff_id
  WHERE workspace.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_staff_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_context() TO authenticated;
