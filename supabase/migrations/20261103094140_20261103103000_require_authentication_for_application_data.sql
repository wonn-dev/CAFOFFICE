/*
# Require authentication for application data

1. Security Changes
- Remove Data API privileges for the anonymous role from every application table.
- Keep the existing authenticated application behavior unchanged.
- Ensure visitors must complete Supabase authentication before any application table can be read or changed directly.

2. Protected Tables
- `agenda_events`
- `caf_offices`
- `clients`
- `credit_payments`
- `credit_requests`
- `credit_transactions`
- `office_credit_accounts`
- `practices`
- `pratica list`
- `pratiche`
- `service_catalog`
- `service_categories`
- `staff_members`
- `account_workspaces`

3. Important Notes
- No rows or columns are deleted or changed.
- The public landing page does not need database access and remains available to visitors.
- Signed-in users continue to use the existing authenticated policies for shared legacy application records and the owner-scoped policies for their private registration records.
*/

REVOKE ALL ON public.agenda_events FROM anon;
REVOKE ALL ON public.caf_offices FROM anon;
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.credit_payments FROM anon;
REVOKE ALL ON public.credit_requests FROM anon;
REVOKE ALL ON public.credit_transactions FROM anon;
REVOKE ALL ON public.office_credit_accounts FROM anon;
REVOKE ALL ON public.practices FROM anon;
REVOKE ALL ON public."pratica list" FROM anon;
REVOKE ALL ON public.pratiche FROM anon;
REVOKE ALL ON public.service_catalog FROM anon;
REVOKE ALL ON public.service_categories FROM anon;
REVOKE ALL ON public.staff_members FROM anon;
REVOKE ALL ON public.account_workspaces FROM anon;