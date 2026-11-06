/*
# Reconcile existing staff workspace office assignments

## Purpose
Some staff profiles were changed by an administrator before the office
synchronization workflow was added. Their display office and authenticated
workspace office can therefore disagree, which causes the credit page to show
the wrong office balance.

## Data correction
- For every staff member with a matching `caf_offices.name`, update the linked
  `account_workspaces.office_id` to that office's ID.
- Only the workspace relationship is corrected; staff records, credit account
  rows, credit transactions, and credit requests are preserved.
- Rows without a matching office name are left unchanged for administrator
  review rather than guessed or reassigned.

## Security
- This is a controlled server-side reconciliation during migration.
- Future changes are protected by `admin_update_staff_member`, which requires
  an authenticated administrator and resolves offices through `caf_offices`.
- Existing RLS policies remain unchanged and continue to scope credit data by
  the authenticated workspace office.
*/

UPDATE public.account_workspaces AS workspace
SET office_id = office.id
FROM public.staff_members AS staff
JOIN public.caf_offices AS office
  ON lower(trim(office.name)) = lower(trim(staff.office))
WHERE workspace.staff_id = staff.id
  AND workspace.office_id IS DISTINCT FROM office.id;
