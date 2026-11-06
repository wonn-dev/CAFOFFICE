/*
# Allow administrators to save the office Paga dopo permission

1. Modified table
- `public.caf_offices` keeps its existing rows and RLS policies.
- The authenticated role receives the UPDATE table privilege required for the
  administrator office-edit screen, including the new `can_pay_later` column.

2. Security
- Existing RLS remains unchanged and continues to restrict updates to an
  administrator or the office owner.
- No anonymous access is added.
- No INSERT, SELECT, or DELETE privilege is changed.
*/

GRANT UPDATE ON public.caf_offices TO authenticated;
