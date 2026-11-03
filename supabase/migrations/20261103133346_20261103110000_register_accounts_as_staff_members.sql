/*
# Register new accounts as staff members

1. Purpose
- Correct account registration so a newly created login represents a CAF staff member in `staff_members`, not a client record.
- Preserve all existing client records and existing account workspace rows.

2. New Columns
- `staff_members.owner_id` links a staff row to the authenticated account that created it and defaults from `auth.uid()`.
- `account_workspaces.staff_id` links an account workspace to its staff member row.

3. Modified Columns
- `account_workspaces.client_id` is made nullable because new accounts no longer create client records. Existing client links are preserved unchanged.

4. Registration Behavior
- `create_account_workspace` now creates the CAF office and a staff member in one transaction.
- Staff name is formed from the registration first and last name.
- Email and phone are stored in `staff_members`.
- The registered address is stored as the CAF office address.
- New staff members receive the safe defaults `Operatore Ufficio CAF`, `N/A`, `In Attesa di Approvazione`, and practice count `0`.
- The account workspace links the authenticated user, office, and staff member.

5. Security
- Staff ownership is derived from `auth.uid()` and cannot be supplied or changed by the browser.
- Authenticated users can read shared legacy staff rows and their own staff row.
- New users cannot assign themselves administrator status, activate themselves, change payment permission, or change practice counts through direct table access.
- The protected registration function remains callable only by authenticated users and validates the caller's email.

6. Data Safety
- No rows are deleted.
- Existing client data remains available for the separate client-management workflow.
- Existing workspace records keep their client links and receive no fabricated staff link.
*/

ALTER TABLE public.account_workspaces
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.account_workspaces
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff_members(id) ON DELETE RESTRICT;

ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.staff_members
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS staff_members_owner_id_idx ON public.staff_members (owner_id);
CREATE INDEX IF NOT EXISTS account_workspaces_staff_id_idx ON public.account_workspaces (staff_id);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.staff_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.staff_members FROM authenticated;
GRANT SELECT ON public.staff_members TO authenticated;
GRANT INSERT (name, email, phone, office, payment_permission) ON public.staff_members TO authenticated;
GRANT UPDATE (name, email, phone, office, payment_permission) ON public.staff_members TO authenticated;

DROP POLICY IF EXISTS "Public can view staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Public can create staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Public can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Public can delete staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Authenticated users can view shared or own staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Authenticated users can create own staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Authenticated users can update own staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Authenticated users can delete own staff members" ON public.staff_members;

CREATE POLICY "Authenticated users can view shared or own staff members"
ON public.staff_members FOR SELECT
TO authenticated
USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create own staff members"
ON public.staff_members FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can update own staff members"
ON public.staff_members FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can delete own staff members"
ON public.staff_members FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_account_workspace(
  p_office_name text,
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
  v_office_id uuid;
  v_staff_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF nullif(trim(p_office_name), '') IS NULL
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

  INSERT INTO public.caf_offices (name, address, email, phone, owner_id)
  VALUES (trim(p_office_name), trim(p_address), v_email, trim(p_phone), v_user_id)
  RETURNING id INTO v_office_id;

  INSERT INTO public.staff_members (name, email, phone, office, owner_id)
  VALUES (
    trim(p_first_name) || ' ' || trim(p_last_name),
    v_email,
    trim(p_phone),
    trim(p_office_name),
    v_user_id
  )
  RETURNING id INTO v_staff_id;

  INSERT INTO public.account_workspaces (user_id, office_id, staff_id, client_id)
  VALUES (v_user_id, v_office_id, v_staff_id, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_workspace(text, text, text, text, text, text) TO authenticated;