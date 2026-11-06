/*
# Reconcile approved requests and prevent duplicate funding

## Purpose
Some requests were marked approved by the old workflow without funding the
office account. This migration repairs those historical approvals and gives
future approval transactions a direct request reference.

## Data changes
- Add nullable `request_id` to `credit_transactions`, linked to
  `credit_requests`; it remains nullable for older manual and practice usage
  transactions.
- Add a unique partial index so one credit request can create at most one
  approval transaction.
- Backfill every approved request that has no linked approval transaction by
  adding its requested credits to the correct office account and creating one
  linked recharge transaction.
- Replace the approval function so new approvals store `request_id`.

## Security
- The backfill runs as part of the trusted migration and does not expose a
  client write path.
- Future approvals still require an active administrator through the existing
  SECURITY DEFINER function.
- The request's stored `office_id` remains the only source for the credited
  office.
- No existing credit transactions are deleted or modified.
*/

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.credit_requests(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_request_id_unique
  ON public.credit_transactions (request_id)
  WHERE request_id IS NOT NULL;

DO $$
DECLARE
  pending_repair record;
  v_account_id uuid;
BEGIN
  FOR pending_repair IN
    SELECT r.id, r.office_id, r.requested_credits, r.note
    FROM public.credit_requests AS r
    WHERE r.status = 'Approvata'
      AND NOT EXISTS (
        SELECT 1
        FROM public.credit_transactions AS t
        WHERE t.request_id = r.id
      )
  LOOP
    UPDATE public.office_credit_accounts
    SET available_credits = available_credits + pending_repair.requested_credits,
        credits_received = credits_received + pending_repair.requested_credits,
        last_recharge_at = COALESCE(
          (SELECT responded_at FROM public.credit_requests WHERE id = pending_repair.id),
          now()
        ),
        updated_at = now()
    WHERE office_id = pending_repair.office_id
    RETURNING id INTO v_account_id;

    IF v_account_id IS NULL THEN
      INSERT INTO public.office_credit_accounts (
        office_id, available_credits, credits_received, credits_used,
        credits_refunded, last_recharge_at
      ) VALUES (
        pending_repair.office_id, pending_repair.requested_credits,
        pending_repair.requested_credits, 0, 0, now()
      )
      RETURNING id INTO v_account_id;
    END IF;

    INSERT INTO public.credit_transactions (
      office_id, request_id, transaction_type, credits, note
    ) VALUES (
      pending_repair.office_id,
      pending_repair.id,
      'recharge',
      pending_repair.requested_credits,
      CASE
        WHEN trim(COALESCE(pending_repair.note, '')) = '' THEN 'Richiesta crediti approvata'
        ELSE 'Richiesta crediti approvata: ' || trim(pending_repair.note)
      END
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_respond_credit_request(
  p_request uuid,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
  v_requested_credits integer;
  v_note text;
  v_account_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('Approvata', 'Rifiutata') THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  SELECT office_id, requested_credits, note
  INTO v_office_id, v_requested_credits, v_note
  FROM public.credit_requests
  WHERE id = p_request
    AND status = 'In attesa'
  FOR UPDATE;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Credit request is not pending';
  END IF;

  IF p_status = 'Rifiutata' THEN
    UPDATE public.credit_requests
    SET status = p_status, responded_at = now()
    WHERE id = p_request;
    RETURN;
  END IF;

  UPDATE public.office_credit_accounts
  SET available_credits = available_credits + v_requested_credits,
      credits_received = credits_received + v_requested_credits,
      last_recharge_at = now(),
      updated_at = now()
  WHERE office_id = v_office_id
  RETURNING id INTO v_account_id;

  IF v_account_id IS NULL THEN
    INSERT INTO public.office_credit_accounts (
      office_id, available_credits, credits_received, credits_used,
      credits_refunded, last_recharge_at
    ) VALUES (
      v_office_id, v_requested_credits, v_requested_credits, 0,
      0, now()
    )
    RETURNING id INTO v_account_id;
  END IF;

  INSERT INTO public.credit_transactions (
    office_id, request_id, transaction_type, credits, note
  ) VALUES (
    v_office_id,
    p_request,
    'recharge',
    v_requested_credits,
    CASE
      WHEN trim(COALESCE(v_note, '')) = '' THEN 'Richiesta crediti approvata'
      ELSE 'Richiesta crediti approvata: ' || trim(v_note)
    END
  );

  UPDATE public.credit_requests
  SET status = p_status, responded_at = now()
  WHERE id = p_request;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_respond_credit_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_respond_credit_request(uuid, text) TO authenticated;
