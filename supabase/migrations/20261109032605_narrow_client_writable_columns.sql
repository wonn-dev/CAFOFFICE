/*
  # Narrow client-writable columns on credit requests and staff members

  1. Problems
     - `credit_requests` INSERT was granted on every column, so an operator
       could submit a request already carrying status 'Approvata' (and a
       responded_at timestamp), misrepresenting its state on the admin screen.
     - `staff_members` UPDATE was granted on name, email, phone, office and
       payment_permission while the UPDATE policy allows a user to edit their
       own row. The app only ever writes name and phone; office and
       payment_permission are operator-facing attributes a user must not set.
     - `staff_members` INSERT was granted to authenticated even though every
       legitimate insert goes through a SECURITY DEFINER function
       (create_account_workspace_for_office / admin_create_staff_member), so a
       user could inject arbitrary rows into the admin's user list.

  2. Fix
     - Re-grant each verb on exactly the columns the application writes.
     - Revoke INSERT on staff_members from authenticated.
*/

REVOKE INSERT ON public.credit_requests FROM authenticated;
GRANT INSERT (office_id, requested_credits, note) ON public.credit_requests TO authenticated;

REVOKE INSERT ON public.staff_members FROM authenticated;

REVOKE UPDATE ON public.staff_members FROM authenticated;
GRANT UPDATE (name, phone) ON public.staff_members TO authenticated;
