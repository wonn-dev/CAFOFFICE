/*
# Restore operator practice creation privileges

1. Purpose
- Allow signed-in operators to create a new practice through the application.
- Keep the existing row-level security rule that requires the practice owner to be the current signed-in user.

2. Modified table
- `public.pratiche`
- Grants INSERT only for the fields submitted by the practice form.
- The `owner_id` column is intentionally excluded so its database default fills it from `auth.uid()` and callers cannot choose another owner.

3. Security
- No RLS policy is widened or replaced.
- Existing authenticated INSERT policy remains responsible for checking `owner_id = auth.uid()`.
- No access is granted to anonymous users.

4. Important notes
- This fixes the permission-denied error shown when an operator creates a practice.
- Practice document uploads continue to be governed separately by storage policies.
*/

GRANT INSERT (
  id,
  client_id,
  client_name,
  tax_code,
  category,
  service,
  deadline,
  priority,
  description,
  amount_received,
  payment_status,
  documents
) ON public.pratiche TO authenticated;