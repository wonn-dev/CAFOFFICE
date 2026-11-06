/*
# Link credit usage history to practices

## Purpose
Credit usage records should identify the practice that consumed the credits,
so an operator can understand exactly which practice caused each deduction.

## Data changes
- Add nullable `practice_id` to `credit_transactions` because older
  transactions predate this link.
- Update `create_practice_with_credit` to store the newly created practice id
  on usage transactions.
- Existing transactions and practice records are preserved.
*/

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS practice_id uuid REFERENCES public.pratiche(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS credit_transactions_practice_id_idx
  ON public.credit_transactions (practice_id);

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
  v_credit_cost integer;
  v_account_id uuid;
  v_charged integer := 0;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT aw.office_id INTO v_office_id
  FROM account_workspaces aw
  WHERE aw.user_id = v_user
  LIMIT 1;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Nessun ufficio associato all''utente';
  END IF;

  SELECT co.name, sm.name INTO v_office_name, v_operator_name
  FROM caf_offices co
  LEFT JOIN staff_members sm ON sm.owner_id = v_user
  WHERE co.id = v_office_id
  LIMIT 1;

  v_office_name := COALESCE(v_office_name, 'Ufficio');
  v_operator_name := COALESCE(v_operator_name, '—');

  SELECT sc.credit_cost INTO v_credit_cost
  FROM service_catalog sc
  JOIN service_categories cat ON cat.id = sc.category_id
  WHERE sc.name = p_service
    AND cat.name = p_category
    AND sc.status = 'Attivo'
  LIMIT 1;

  IF v_credit_cost IS NULL THEN
    v_credit_cost := 0;
  END IF;

  IF v_credit_cost > 0 THEN
    UPDATE office_credit_accounts
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

  INSERT INTO pratiche (
    id, client_id, client_name, category, service, deadline, priority,
    description, amount_received, payment_status, documents,
    office, operator, credit_cost_charged, owner_id
  ) VALUES (
    p_id, p_client_id, p_client_name, p_category, p_service, p_deadline, p_priority,
    p_description, p_amount_received, p_payment_status, p_documents,
    v_office_name, v_operator_name, v_charged, v_user
  )
  RETURNING id INTO v_new_id;

  IF v_charged > 0 THEN
    INSERT INTO credit_transactions (office_id, practice_id, transaction_type, credits, note)
    VALUES (v_office_id, v_new_id, 'usage', v_charged, 'Pratica: ' || p_service);
  END IF;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) TO authenticated;
