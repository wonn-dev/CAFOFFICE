/*
# Add office-level Paga dopo permission

## Purpose
Administrators need to decide which CAF offices may create practices with the
customer payment deferred. This permission belongs to the office, not to a
single operator, so every operator assigned to that office follows the same
rule.

## Data changes
- Add `caf_offices.can_pay_later`, defaulting to `false` so existing offices
  cannot use Paga dopo until an administrator explicitly enables it.

## Practice creation enforcement
- Update `create_practice_with_credit` to verify the selected office's
  permission when `p_payment_status = 'Paga dopo'`.
- A permitted Paga dopo practice is created without charging service credits.
- All other practices keep the existing credit-charging behavior.
- The office is still resolved from the authenticated user's
  `account_workspaces` row; the client cannot choose another office.

## Security
- The new column remains protected by the existing `caf_offices` RLS rules.
- The server-side practice function enforces the permission even if a caller
  sends a forged payment status directly to the API.
- No existing office, practice, credit balance, or transaction is deleted.
*/

ALTER TABLE public.caf_offices
  ADD COLUMN IF NOT EXISTS can_pay_later boolean NOT NULL DEFAULT false;

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

  IF v_charged > 0 THEN
    INSERT INTO public.credit_transactions (office_id, practice_id, transaction_type, credits, note)
    VALUES (v_office_id, v_new_id, 'usage', v_charged, 'Pratica: ' || p_service);
  END IF;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) TO authenticated;
