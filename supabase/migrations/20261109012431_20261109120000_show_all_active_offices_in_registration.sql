/*
# Show all active CAF offices during account registration

1. Modified Function
- `public.list_registration_offices()` now returns every active office from
  `public.caf_offices`, including offices whose owner is an operator account.
- The function still returns only the office id and display name needed by the
  public account-registration form.

2. Registration Behavior
- All active offices connected to the CAF office table can be selected when a
  new account is created.
- Inactive offices remain hidden and cannot be selected.
- The existing `create_account_workspace_for_office` function continues to
  validate that the selected office exists and is active before creating the
  account workspace.

3. Security
- The function remains `SECURITY DEFINER` with a fixed `public` search path.
- Only office identifiers and names are exposed.
- Execute access remains limited to the public signup roles needed by the
  registration flow (`anon` and `authenticated`).
- No tables, columns, office records, or user records are deleted or changed.

4. Important Notes
- This is an authorization-safe directory of active offices, not a private
  staff listing.
- The account-creation function remains the final server-side validation point.
*/

CREATE OR REPLACE FUNCTION public.list_registration_offices()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT office.id, office.name
  FROM public.caf_offices AS office
  WHERE office.is_active = true
  ORDER BY office.name;
$$;

REVOKE EXECUTE ON FUNCTION public.list_registration_offices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_registration_offices() TO anon, authenticated;
