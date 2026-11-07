/*
# Synchronize user practice counts with created practices

1. Purpose
- Make the “Pratiche” value in “Utenti e Ruoli” reflect practices created by each authenticated staff member.
- Correct existing authenticated staff counts where practices are already linked through `pratiche.owner_id`.

2. Modified data
- `staff_members.practice_count` is backfilled from linked `pratiche` rows when a staff member has an authenticated owner and at least one linked practice.
- Legacy staff rows without linked authenticated practices keep their existing display count so historical dashboard figures are not discarded.

3. Modified functions
- `public.create_practice_with_credit(...)` now increases the creator's `staff_members.practice_count` after the practice is inserted.
- `public.admin_update_staff_member(...)` recalculates the count from linked practices whenever the staff member has linked practices, so the administrator form cannot overwrite the real count with a stale value.

4. Security
- Both functions remain `SECURITY DEFINER` with `search_path` fixed to `public`.
- Existing authorization checks and execute grants are preserved.
- No new client-visible privileges or RLS exceptions are added.

5. Data safety
- No practices, staff members, or related records are deleted or recreated.
- Existing legacy counts are preserved when no authenticated practice ownership link exists.
*/

UPDATE public.staff_members AS staff
SET practice_count = counts.actual_count
FROM (
  SELECT staff_member.id, COUNT(practice.id)::integer AS actual_count
  FROM public.staff_members AS staff_member
  JOIN public.pratiche AS practice ON practice.owner_id = staff_member.owner_id
  WHERE staff_member.owner_id IS NOT NULL
  GROUP BY staff_member.id
) AS counts
WHERE staff.id = counts.id;

CREATE OR REPLACE FUNCTION public.create_practice_with_credit(
  p_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_category text,
  p_service text,
  p_deadline date,
  p_priority text,
  p_description text,
  p_amount_received numeric,
  p_payment_status text,
  p_documents jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_office_id uuid;
  v_office_name text;
  v_operator_name text;
  v_can_pay_later boolean := false;
  v_credit_cost integer;
  v_account_id uuid;
  v_charged integer := 0;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT aw.office_id INTO v_office_id
  FROM public.account_workspaces AS aw
  WHERE aw.user_id = v_user
  LIMIT 1;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Nessun ufficio associato all''utente';
  END IF;

  SELECT co.name, co.can_pay_later, sm.name
  INTO v_office_name, v_can_pay_later, v_operator_name
  FROM public.caf_offices AS co
  LEFT JOIN public.staff_members AS sm ON sm.owner_id = v_user
  WHERE co.id = v_office_id
  LIMIT 1;

  IF p_payment_status = 'Paga dopo' AND NOT COALESCE(v_can_pay_later, false) THEN
    RAISE EXCEPTION 'Paga dopo non autorizzato per questo ufficio';
  END IF;

  v_office_name := COALESCE(v_office_name, 'Ufficio');
  v_operator_name := COALESCE(v_operator_name, '—');

  SELECT sc.credit_cost INTO v_credit_cost
  FROM public.service_catalog AS sc
  JOIN public.service_categories AS cat ON cat.id = sc.category_id
  WHERE sc.name = p_service
    AND cat.name = p_category
    AND sc.status = 'Attivo'
  LIMIT 1;

  IF v_credit_cost IS NULL THEN
    v_credit_cost := 0;
  END IF;

  IF v_credit_cost > 0 AND p_payment_status <> 'Paga dopo' THEN
    UPDATE public.office_credit_accounts
    SET available_credits = available_credits - v_credit_cost,
        credits_used = credits_used + v_credit_cost,
        updated_at = now()
    WHERE office_id = v_office_id
      AND available_credits >= v_credit_cost
    RETURNING id INTO v_account_id;

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Credito insufficiente';
    END IF;

    v_charged := v_credit_cost;
  END IF;

  INSERT INTO public.pratiche (
    id, client_id, client_name, category, service, deadline, priority,
    description, amount_received, payment_status, documents,
    office, operator, credit_cost_charged, owner_id
  ) VALUES (
    p_id, p_client_id, p_client_name, p_category, p_service, p_deadline,
    p_priority, p_description, p_amount_received, p_payment_status,
    p_documents, v_office_name, v_operator_name, v_charged, v_user
  )
  RETURNING id INTO v_new_id;

  UPDATE public.staff_members
  SET practice_count = practice_count + 1
  WHERE owner_id = v_user;

  IF v_charged > 0 THEN
    INSERT INTO public.credit_transactions (office_id, practice_id, transaction_type, credits, note)
    VALUES (v_office_id, v_new_id, 'usage', v_charged, 'Pratica: ' || p_service);
  END IF;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) TO authenticated;

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
  v_actual_practice_count integer;
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

  SELECT COUNT(*)::integer INTO v_actual_practice_count
  FROM public.pratiche
  WHERE owner_id = v_owner_id;

  UPDATE public.staff_members
  SET name = trim(p_name),
      email = lower(trim(p_email)),
      phone = trim(p_phone),
      role = p_role,
      office = trim(p_office),
      payment_permission = p_payment_permission,
      status = p_status,
      practice_count = CASE
        WHEN v_owner_id IS NOT NULL AND v_actual_practice_count > 0 THEN v_actual_practice_count
        ELSE p_practice_count
      END
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