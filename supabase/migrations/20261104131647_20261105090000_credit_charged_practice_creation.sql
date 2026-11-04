/*
# Credit system for practice creation

## Purpose
Each office has its own credit balance. When an operator creates a practice,
the selected service's credit cost is looked up server-side and atomically
deducted from the operator's office account. Practice creation is forced
through a SECURITY DEFINER function so the credit check + deduction cannot
be bypassed by a direct client insert.

## Changes

### 1. New column on `pratiche`
- `credit_cost_charged` (integer, NOT NULL, default 0) — the number of credits
  actually deducted when the practice was created. Stored for historical
  reference even if the service price changes later.

### 2. New function `create_practice_with_credit(...)`
SECURITY DEFINER PL/pgSQL function that, in a single atomic operation:
1. Resolves the caller's office from `account_workspaces` (server-side, not
   trusting any client-supplied office/operator).
2. Resolves the office name (from `caf_offices`) and operator name (from
   `staff_members`) for the caller.
3. Looks up the selected service's `credit_cost` from `service_catalog` by
   service name + category name (server-side lookup — the client value is
   never trusted for the amount).
4. If the service costs credits (> 0): atomically deducts from
   `office_credit_accounts` with `WHERE available_credits >= cost RETURNING`
   — the check and the deduction are the same statement, so two concurrent
   practices cannot both succeed on an insufficient balance. If no row is
   returned, raises `Credito insufficiente`. Logs a `credit_transactions`
   row with type `usage`.
5. Inserts the `pratiche` row with the server-resolved office/operator and
   the charged credit amount. Returns the new practice id.
6. Services with null/0 credit cost are free — no deduction, practice still
   created.

### 3. Revoke direct INSERT on `pratiche`
The previous column-level INSERT grant to `authenticated` is revoked so
practice creation MUST go through the function. The function is SECURITY
DEFINER (runs as owner) so it can insert regardless.

### 4. Operators can read their own office credit balance
- New SELECT policy `operators_select_own_office_account` on
  `office_credit_accounts` scoped to the caller's office via
  `account_workspaces`. Admins already see all via existing admin policies.
- GRANT SELECT on `office_credit_accounts` to `authenticated` so the Data
  API can reach it (the new policy + existing admin policy decide which rows).

## Security
- RLS remains enabled on all touched tables.
- The function derives the actor from `auth.uid()` only; no client-supplied
  identity is trusted. `SET search_path = public`.
- EXECUTE on the function revoked from PUBLIC/anon, granted to authenticated.
- Credit deduction is atomic (single UPDATE ... RETURNING) to prevent race
  conditions.
*/

-- 1. Historical charge column
ALTER TABLE pratiche
  ADD COLUMN IF NOT EXISTS credit_cost_charged integer NOT NULL DEFAULT 0;

-- 2. Atomic practice-creation function with credit deduction
CREATE OR REPLACE FUNCTION create_practice_with_credit(
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

  -- Resolve the caller's office server-side
  SELECT aw.office_id INTO v_office_id
  FROM account_workspaces aw
  WHERE aw.user_id = v_user
  LIMIT 1;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Nessun ufficio associato all''utente';
  END IF;

  -- Resolve office name + operator name server-side
  SELECT co.name, sm.name INTO v_office_name, v_operator_name
  FROM caf_offices co
  LEFT JOIN staff_members sm ON sm.owner_id = v_user
  WHERE co.id = v_office_id
  LIMIT 1;

  v_office_name := COALESCE(v_office_name, 'Ufficio');
  v_operator_name := COALESCE(v_operator_name, '—');

  -- Look up the service credit cost server-side (by name + category)
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

  -- Atomic check + deduction when the service costs credits
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

    INSERT INTO credit_transactions (office_id, transaction_type, credits, note)
      VALUES (v_office_id, 'usage', v_credit_cost, 'Pratica: ' || p_service);
  END IF;

  -- Insert the practice with server-resolved office/operator + charged credits
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

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_practice_with_credit(uuid, uuid, text, text, text, date, text, text, numeric, text, jsonb) TO authenticated;

-- 3. Force practice creation through the function
REVOKE INSERT ON pratiche FROM authenticated;

-- 4. Operators can read their own office credit balance
GRANT SELECT ON office_credit_accounts TO authenticated;

DROP POLICY IF EXISTS "operators_select_own_office_account" ON office_credit_accounts;
CREATE POLICY "operators_select_own_office_account" ON office_credit_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_workspaces
      WHERE account_workspaces.user_id = auth.uid()
        AND account_workspaces.office_id = office_credit_accounts.office_id
    )
  );
