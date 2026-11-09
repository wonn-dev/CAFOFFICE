/*
# Make account office assignment durable for all registrations

1. Purpose
- Ensure every future account registered with an existing CAF office receives a durable workspace link to that office.
- Make the registration operation safe if the browser retries after authentication or reloads during setup.
- Repair existing owned staff accounts that have a valid office name but no workspace row.

2. Modified functions
- Replace `public.create_account_workspace_for_office(...)` with an idempotent implementation.
- The function validates the authenticated account, selected active office, and required registration details.
- If the account already has a workspace, its office and staff profile are synchronized instead of creating a duplicate.
- If the account has no workspace, one staff profile and one workspace are created under the selected office.

3. Data repair
- Create missing `account_workspaces` rows only for existing staff records with an owner account and a matching CAF office.
- No records are deleted, and no credit balances or credit transactions are moved.

4. Security
- The registration function remains SECURITY DEFINER with a fixed `public` search path.
- It can only be called by authenticated users.
- The office must be active and selected from the existing CAF office records.
- The workspace is always written for `auth.uid()` and cannot be assigned to another account.
*/

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
  v_existing_staff_id uuid;
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

  SELECT workspace.staff_id
  INTO v_existing_staff_id
  FROM public.account_workspaces AS workspace
  WHERE workspace.user_id = v_user_id
  LIMIT 1;

  IF v_existing_staff_id IS NULL THEN
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
    VALUES (v_user_id, p_office_id, v_staff_id, NULL)
    ON CONFLICT (user_id) DO UPDATE
      SET office_id = EXCLUDED.office_id,
          staff_id = EXCLUDED.staff_id;
  ELSE
    UPDATE public.staff_members
    SET name = trim(p_first_name) || ' ' || trim(p_last_name),
        email = v_email,
        phone = trim(p_phone),
        office = v_office_name
    WHERE id = v_existing_staff_id
      AND owner_id = v_user_id;

    UPDATE public.account_workspaces
    SET office_id = p_office_id
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) TO authenticated;

INSERT INTO public.account_workspaces (user_id, office_id, staff_id, client_id)
SELECT staff.owner_id, office.id, staff.id, NULL
FROM public.staff_members AS staff
JOIN LATERAL (
  SELECT candidate.id
  FROM public.caf_offices AS candidate
  WHERE candidate.is_active = true
    AND lower(trim(candidate.name)) = lower(trim(staff.office))
  ORDER BY candidate.created_at, candidate.id
  LIMIT 1
) AS office ON true
WHERE staff.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.account_workspaces AS existing_workspace
    WHERE existing_workspace.user_id = staff.owner_id
  )
ON CONFLICT (user_id) DO NOTHING;
