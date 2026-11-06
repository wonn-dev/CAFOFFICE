/*
# Approve credit requests and fund the linked office

## Purpose
Approving a credit request must add the requested credits to the exact office
account linked to that request. Previously the administrator action changed
only the request status, leaving the office balance unchanged.

## New function
- `admin_respond_credit_request(p_request, p_status)` handles approval and
  rejection in one server-side operation.
- Approval locks and validates the pending request, creates the office credit
  account if needed, increments available and received credits, records a
  recharge transaction, and marks the request approved.
- Rejection marks the pending request rejected without changing the balance.
- The operation is atomic: either all approval changes succeed or none do.

## Security
- Only an authenticated active administrator can call the function.
- The office ID is taken from the stored request, never from a client-provided
  office parameter.
- Direct authenticated updates to `credit_requests` are revoked so clients
  must use the checked function for status changes.
- Existing RLS policies continue to protect request and office credit rows.
- No existing credit history is deleted or rewritten.
*/

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

  INSERT INTO public.credit_transactions (office_id, transaction_type, credits, note)
  VALUES (
    v_office_id,
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

REVOKE UPDATE ON public.credit_requests FROM authenticated;
