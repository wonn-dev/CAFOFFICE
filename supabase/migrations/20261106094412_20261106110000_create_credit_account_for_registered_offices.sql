/*
# Create credit accounts for registered CAF offices

## Purpose
Every CAF office needs a row in `office_credit_accounts` before credits can
be assigned. Previously, account registration created the office and staff
member but omitted this zero-balance account, so administrators saw the office
but the recharge form reported that its credit account was unavailable.

## Data changes
- Backfill one zero-balance credit account for every existing CAF office that
  does not have one.
- Update `create_account_workspace` so every newly registered office receives
  its credit account in the same protected operation.
- Existing balances and transactions are preserved.

## Security
- The registration function remains `SECURITY DEFINER`, uses the authenticated
  user's identity, and remains callable only by authenticated users.
- No client-supplied credit amount or privileged credit value is accepted during
  registration; new accounts always start at zero credits.
*/

INSERT INTO public.office_credit_accounts (office_id)
SELECT office.id
FROM public.caf_offices AS office
WHERE NOT EXISTS (
  SELECT 1
  FROM public.office_credit_accounts AS account
  WHERE account.office_id = office.id
);

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

  INSERT INTO public.office_credit_accounts (office_id)
  VALUES (v_office_id);

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
