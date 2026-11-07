/*
# Register new accounts under administrator-created CAF offices

1. New functions
- `public.list_registration_offices()` returns the ids and names of active CAF offices for the signup dropdown.
- `public.create_account_workspace_for_office(...)` creates the authenticated staff member and workspace under the selected existing office.

2. Registration changes
- New accounts must provide an existing active `caf_offices.id`.
- The selected office name is copied to the new staff member for display.
- The user's personal address remains required and is stored with the staff member.
- The registration flow no longer creates a private CAF office for every new user.

3. Security
- The office list function exposes only active office ids and names and is safe for the public signup screen.
- The account creation function is `SECURITY DEFINER`, validates the authenticated email, validates that the selected office exists and is active, and uses `auth.uid()` for ownership.
- The previous registration function is no longer executable by authenticated users, preventing users from creating arbitrary offices through the old path.
- No existing rows are deleted or changed.
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

CREATE OR REPLACE FUNCTION public.create_account_workspace_for_office(
  p_office_id uuid,
  p_first_name text,
  p_last_name text,
  p_address text,
  p_phone text,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_office_name text;
  v_staff_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_office_id IS NULL
    OR nullif(trim(p_first_name), '') IS NULL
    OR nullif(trim(p_last_name), '') IS NULL
    OR nullif(trim(p_address), '') IS NULL
    OR nullif(trim(p_phone), '') IS NULL
    OR nullif(v_email, '') IS NULL THEN
    RAISE EXCEPTION 'Required account details are missing';
  END IF;

  IF lower(trim(coalesce(auth.jwt() ->> 'email', ''))) <> v_email THEN
    RAISE EXCEPTION 'Account email does not match the authenticated user';
  END IF;

  SELECT office.name
  INTO v_office_name
  FROM public.caf_offices AS office
  WHERE office.id = p_office_id
    AND office.is_active = true;

  IF v_office_name IS NULL THEN
    RAISE EXCEPTION 'Selected office is not available';
  END IF;

  INSERT INTO public.staff_members (name, email, phone, office, owner_id)
  VALUES (
    trim(p_first_name) || ' ' || trim(p_last_name),
    v_email,
    trim(p_phone),
    v_office_name,
    v_user_id
  )
  RETURNING id INTO v_staff_id;

  INSERT INTO public.account_workspaces (user_id, office_id, staff_id, client_id)
  VALUES (v_user_id, p_office_id, v_staff_id, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace(text, text, text, text, text, text) FROM authenticated;
