/*
# Synchronize staff office changes with authenticated workspaces

## Purpose
Changing an operator's office in the administrator's user-management screen
must also change the office used by that operator's authenticated session. The
credit system is linked to `account_workspaces.office_id`, so both records
must stay synchronized.

## Modified workflow
- `admin_update_staff_member` now resolves the selected office name against
  `caf_offices` and rejects unknown offices.
- The staff profile's display office is updated as before.
- Every workspace linked to that staff member is updated to the selected
  `caf_offices.id`.
- If the staff member has an authenticated owner but no workspace row yet, a
  workspace row is created for that office so the login context is complete.

## Security
- Only an authenticated administrator can call the SECURITY DEFINER function.
- The fixed `public` search path is retained.
- The client still cannot choose an arbitrary office ID; the function resolves
  it from the administrator-selected office name in `caf_offices`.
- Credit balances and credit history remain protected by their existing
  office-scoped RLS policies.
- No existing credit data is moved, deleted, or recreated; only the user's
  workspace association changes.
*/

CREATE OR REPLACE FUNCTION public.admin_update_staff_member(
  p_member uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_role text,
  p_office text,
  p_payment_permission text,
  p_status text,
  p_practice_count integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
  v_owner_id uuid;
  v_workspace_count integer;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('Amministratore', 'Operatore Back-Office', 'Admin Ufficio CAF', 'Operatore Ufficio CAF', 'In Attesa di Approvazione') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF p_status NOT IN ('Attivo', 'Inattivo', 'In Attesa di Approvazione') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  IF p_practice_count IS NULL OR p_practice_count < 0 THEN
    RAISE EXCEPTION 'Invalid practice count';
  END IF;

  SELECT id INTO v_office_id
  FROM public.caf_offices
  WHERE lower(trim(name)) = lower(trim(p_office))
  LIMIT 1;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Invalid office';
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.staff_members
  WHERE id = p_member;

  UPDATE public.staff_members
  SET name = trim(p_name),
      email = lower(trim(p_email)),
      phone = trim(p_phone),
      role = p_role,
      office = trim(p_office),
      payment_permission = p_payment_permission,
      status = p_status,
      practice_count = p_practice_count
  WHERE id = p_member;

  UPDATE public.account_workspaces
  SET office_id = v_office_id
  WHERE staff_id = p_member;

  GET DIAGNOSTICS v_workspace_count = ROW_COUNT;

  IF v_workspace_count = 0 AND v_owner_id IS NOT NULL THEN
    INSERT INTO public.account_workspaces (user_id, office_id, staff_id)
    VALUES (v_owner_id, v_office_id, p_member);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_staff_member(uuid, text, text, text, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_member(uuid, text, text, text, text, text, text, text, integer) TO authenticated;
