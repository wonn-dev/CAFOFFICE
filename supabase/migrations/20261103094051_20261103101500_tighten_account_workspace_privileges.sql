/*
# Tighten account workspace privileges

1. Security Changes
- Remove INSERT, UPDATE, and DELETE privileges from authenticated users on `account_workspaces`.
- Keep SELECT access limited to the authenticated user's own workspace through the existing RLS policy.
- Preserve the protected registration function as the only path that creates workspace links.

2. Important Notes
- No tables, columns, rows, or relationships are removed.
- Existing account registration behavior remains unchanged.
*/

REVOKE INSERT, UPDATE, DELETE ON public.account_workspaces FROM authenticated;
GRANT SELECT ON public.account_workspaces TO authenticated;