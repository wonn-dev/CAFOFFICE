/*
  # Stop registered users re-pointing their workspace to another office

  1. Problem
     - create_account_workspace_for_office() is EXECUTE-able by every
       authenticated user and its repair branch unconditionally ran
       `UPDATE account_workspaces SET office_id = p_office_id WHERE user_id = ...`.
       An already-registered operator could call the RPC again with any active
       office id and immediately read that office's credit balance, transaction
       history and credit requests, because those policies key on
       account_workspaces.office_id.

  2. Fix
     - The repair branch now only sets office_id when the existing workspace has
       no office yet. Reassigning an office stays with
       admin_update_staff_member(), which is administrator-gated.
     - Personal detail repair (name, phone, email) is preserved.
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
SET search_path TO 'public'
AS $function$
DECLARE
v_user_id uuid := auth.uid();
v_office_name text;
v_staff_id uuid;
v_existing_staff_id uuid;
v_existing_office_id uuid;
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

SELECT workspace.staff_id, workspace.office_id
INTO v_existing_staff_id, v_existing_office_id
FROM public.account_workspaces AS workspace
WHERE workspace.user_id = v_user_id
LIMIT 1;

-- An account that already belongs to an office cannot move itself.
IF v_existing_staff_id IS NOT NULL
AND v_existing_office_id IS NOT NULL
AND v_existing_office_id <> p_office_id THEN
RAISE EXCEPTION 'Account is already assigned to an office';
END IF;

-- Ensure the office has a credit account (zero-balance if new)
INSERT INTO public.office_credit_accounts (office_id)
VALUES (p_office_id)
ON CONFLICT (office_id) DO NOTHING;

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

-- Only fill in a missing office; never move an assigned account.
UPDATE public.account_workspaces
SET office_id = p_office_id
WHERE user_id = v_user_id
AND office_id IS NULL;
END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_workspace_for_office(uuid, text, text, text, text, text) TO authenticated, service_role;
