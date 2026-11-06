/*
# Enable operator credit requests and history

## Purpose
Operators need to see the credit balance belonging to their own CAF office,
submit a credit request for that office, and review the credit transactions
created by their practices. Administrators retain full credit management access.

## Security
- Operators can read only records linked to an office in their
  `account_workspaces` row.
- Operators can create credit requests only for their own office.
- Operators cannot approve, edit, or delete requests and cannot create or edit
  payments, balances, or transactions.
- Administrators keep the existing full-management policies.
*/

DROP POLICY IF EXISTS "Administrators can view credit requests" ON public.credit_requests;
CREATE POLICY "Permitted users can view credit requests"
ON public.credit_requests FOR SELECT
TO authenticated
USING (
  public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.account_workspaces
    WHERE account_workspaces.user_id = auth.uid()
      AND account_workspaces.office_id = credit_requests.office_id
  )
);

DROP POLICY IF EXISTS "Administrators can create credit requests" ON public.credit_requests;
CREATE POLICY "Permitted users can create credit requests"
ON public.credit_requests FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.account_workspaces
    WHERE account_workspaces.user_id = auth.uid()
      AND account_workspaces.office_id = credit_requests.office_id
  )
);

DROP POLICY IF EXISTS "Administrators can view credit transactions" ON public.credit_transactions;
CREATE POLICY "Permitted users can view credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (
  public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.account_workspaces
    WHERE account_workspaces.user_id = auth.uid()
      AND account_workspaces.office_id = credit_transactions.office_id
  )
);
