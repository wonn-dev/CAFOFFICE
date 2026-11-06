/*
# Make registered CAF offices visible to administrators

## Purpose
Registered offices are stored in `caf_offices` with the registering user's
`owner_id`. The previous SELECT policy allowed only shared offices or the
current user's own office, which hid offices created by other collaborating
users from administrators.

## Security changes
- Replace the CAF office SELECT policy with one that lets administrators read
  every office, while non-administrators can read shared offices and their own
  office only.
- Keep INSERT, UPDATE, and DELETE ownership restrictions unchanged for regular
  users. Existing administrator management functions and policies remain the
  controlled path for administrator changes.
- No rows are deleted or modified.
*/

DROP POLICY IF EXISTS "Authenticated users can view shared or own CAF offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Authenticated users can view permitted CAF offices" ON public.caf_offices;

CREATE POLICY "Authenticated users can view permitted CAF offices"
ON public.caf_offices FOR SELECT
TO authenticated
USING (is_current_user_admin() OR owner_id IS NULL OR owner_id = auth.uid());
