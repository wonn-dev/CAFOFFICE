/*
# Restrict signup offices to administrator-managed offices

1. Modified function
- `public.list_registration_offices()` now returns only active shared offices
  or active offices whose owner is an administrator.
- Offices created by ordinary operators are not offered to new registrants.

2. Security
- The function remains `SECURITY DEFINER` and exposes only office ids and names.
- The registration form cannot choose an operator-owned private office.
- No existing offices or user records are changed.
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
    AND (
      office.owner_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.staff_members AS administrator
        WHERE administrator.owner_id = office.owner_id
          AND administrator.role = 'Amministratore'
      )
    )
  ORDER BY office.name;
$$;

REVOKE EXECUTE ON FUNCTION public.list_registration_offices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_registration_offices() TO anon, authenticated;
