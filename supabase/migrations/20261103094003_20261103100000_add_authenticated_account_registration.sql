/*
# Add authenticated CAF account registration

1. New Tables
- `account_workspaces` links one Supabase authenticated user to the CAF office and client records created during registration.
- `id` is the workspace identifier.
- `user_id` identifies the authenticated account and is unique so an account has one workspace.
- `office_id` references the account's CAF office.
- `client_id` references the account holder's client record.
- `created_at` records when the workspace was created.

2. Modified Tables
- `caf_offices.owner_id` identifies the account that created a private office. Existing rows remain shared system records when this value is null.
- `clients.owner_id` identifies the account that created a private client record. Existing rows remain shared system records when this value is null.
- New private rows receive the authenticated user automatically through a database default.

3. Security
- Anonymous access to CAF offices and clients is removed.
- Authenticated users can read shared legacy rows and their own rows.
- Authenticated users can create rows owned by their own account, but cannot set or change ownership.
- Only the owning authenticated user can update or delete private rows.
- `account_workspaces` is readable only by its owner.
- `create_account_workspace` is a protected SECURITY DEFINER function that creates the office, client, and workspace together using `auth.uid()`.
- The function has a fixed search path and cannot be called by anonymous users.

4. Important Notes
- The office address and client address are written from the same registration value.
- Existing data is preserved and is not deleted or renamed.
- Existing shared records remain available to signed-in users so the current dashboard continues to have its seeded content.
*/

CREATE TABLE IF NOT EXISTS public.account_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.caf_offices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caf_offices
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.caf_offices
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE public.clients
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS caf_offices_owner_id_idx ON public.caf_offices (owner_id);
CREATE INDEX IF NOT EXISTS clients_owner_id_idx ON public.clients (owner_id);
CREATE INDEX IF NOT EXISTS account_workspaces_user_id_idx ON public.account_workspaces (user_id);

ALTER TABLE public.account_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caf_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.caf_offices FROM anon;
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.account_workspaces FROM anon;

REVOKE INSERT, UPDATE ON public.caf_offices FROM authenticated;
GRANT SELECT, DELETE ON public.caf_offices TO authenticated;
GRANT INSERT (name, address, vat_number, email, phone, is_active) ON public.caf_offices TO authenticated;
GRANT UPDATE (name, address, vat_number, email, phone, is_active) ON public.caf_offices TO authenticated;

REVOKE INSERT, UPDATE ON public.clients FROM authenticated;
GRANT SELECT, DELETE ON public.clients TO authenticated;
GRANT INSERT (first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office) ON public.clients TO authenticated;
GRANT UPDATE (first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office) ON public.clients TO authenticated;

GRANT SELECT ON public.account_workspaces TO authenticated;

DROP POLICY IF EXISTS "Public can view CAF offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Public can create CAF offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Public can update CAF offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Public can delete CAF offices" ON public.caf_offices;

CREATE POLICY "Authenticated users can view shared or own CAF offices"
ON public.caf_offices FOR SELECT
TO authenticated
USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create own CAF offices"
ON public.caf_offices FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can update own CAF offices"
ON public.caf_offices FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can delete own CAF offices"
ON public.caf_offices FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Public can view clients" ON public.clients;
DROP POLICY IF EXISTS "Public can create clients" ON public.clients;
DROP POLICY IF EXISTS "Public can update clients" ON public.clients;
DROP POLICY IF EXISTS "Public can delete clients" ON public.clients;

CREATE POLICY "Authenticated users can view shared or own clients"
ON public.clients FOR SELECT
TO authenticated
USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create own clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can update own clients"
ON public.clients FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can delete own clients"
ON public.clients FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own account workspace" ON public.account_workspaces;
CREATE POLICY "Users can view own account workspace"
ON public.account_workspaces FOR SELECT
TO authenticated
USING (user_id = auth.uid());

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
  v_client_id uuid;
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

  INSERT INTO public.clients (first_name, last_name, email, phone, address, office, owner_id)
  VALUES (trim(p_first_name), trim(p_last_name), v_email, trim(p_phone), trim(p_address), trim(p_office_name), v_user_id)
  RETURNING id INTO v_client_id;

  INSERT INTO public.account_workspaces (user_id, office_id, client_id)
  VALUES (v_user_id, v_office_id, v_client_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_workspace(text, text, text, text, text, text) TO authenticated;