/*
# Create credit management and payment records

1. New Tables
- `office_credit_accounts` stores the current credit balance for each CAF office.
- `office_credit_accounts.office_id` links the account to `caf_offices`.
- `available_credits` stores credits currently available to the office.
- `credits_received` stores the total credits assigned to the office.
- `credits_used` stores credits consumed by the office.
- `credits_refunded` stores credits returned to the office.
- `last_recharge_at` stores the latest recharge date.
- `credit_transactions` stores every recharge, usage, refund, or adjustment.
- `credit_requests` stores requests made by offices that need additional credits.
- `credit_payments` stores payment records connected to credit recharges.

2. Security
- Row level security is enabled on all new tables.
- Anonymous and authenticated roles have shared CRUD access because this app has no sign-in screen.
- Separate CRUD policies and Data API grants are included for every table.

3. Initial Data
- One credit account is created for each existing CAF office.
- CAF Centro Milano starts with the 150 credits shown in the reference design.
- A completed sample payment and recharge transaction are recorded for that initial balance.

4. Data Integrity
- Credit quantities and payment amounts cannot be negative.
- Each office can have only one credit account.
- Deleting an office removes its related credit records through the existing office relationship.
*/

CREATE TABLE IF NOT EXISTS public.office_credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL UNIQUE REFERENCES public.caf_offices(id) ON DELETE CASCADE,
  available_credits integer NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  credits_received integer NOT NULL DEFAULT 0 CHECK (credits_received >= 0),
  credits_used integer NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  credits_refunded integer NOT NULL DEFAULT 0 CHECK (credits_refunded >= 0),
  last_recharge_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.caf_offices(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('recharge', 'usage', 'refund', 'adjustment')),
  credits integer NOT NULL CHECK (credits > 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.caf_offices(id) ON DELETE CASCADE,
  requested_credits integer NOT NULL CHECK (requested_credits > 0),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'In attesa' CHECK (status IN ('In attesa', 'Approvata', 'Rifiutata')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.caf_offices(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL DEFAULT 'Bonifico',
  reference text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pagato' CHECK (status IN ('In attesa', 'Pagato', 'Annullato')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.office_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_credit_accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_payments TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Public can view office credit accounts" ON public.office_credit_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Public can create office credit accounts" ON public.office_credit_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Public can update office credit accounts" ON public.office_credit_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Public can delete office credit accounts" ON public.office_credit_accounts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view credit transactions" ON public.credit_transactions;
CREATE POLICY "Public can view credit transactions" ON public.credit_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create credit transactions" ON public.credit_transactions;
CREATE POLICY "Public can create credit transactions" ON public.credit_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update credit transactions" ON public.credit_transactions;
CREATE POLICY "Public can update credit transactions" ON public.credit_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete credit transactions" ON public.credit_transactions;
CREATE POLICY "Public can delete credit transactions" ON public.credit_transactions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view credit requests" ON public.credit_requests;
CREATE POLICY "Public can view credit requests" ON public.credit_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create credit requests" ON public.credit_requests;
CREATE POLICY "Public can create credit requests" ON public.credit_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update credit requests" ON public.credit_requests;
CREATE POLICY "Public can update credit requests" ON public.credit_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete credit requests" ON public.credit_requests;
CREATE POLICY "Public can delete credit requests" ON public.credit_requests FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view credit payments" ON public.credit_payments;
CREATE POLICY "Public can view credit payments" ON public.credit_payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create credit payments" ON public.credit_payments;
CREATE POLICY "Public can create credit payments" ON public.credit_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update credit payments" ON public.credit_payments;
CREATE POLICY "Public can update credit payments" ON public.credit_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete credit payments" ON public.credit_payments;
CREATE POLICY "Public can delete credit payments" ON public.credit_payments FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.office_credit_accounts (office_id, available_credits, credits_received, last_recharge_at)
SELECT id, CASE WHEN name = 'CAF Centro Milano' THEN 150 ELSE 0 END, CASE WHEN name = 'CAF Centro Milano' THEN 150 ELSE 0 END, CASE WHEN name = 'CAF Centro Milano' THEN now() ELSE NULL END
FROM public.caf_offices
ON CONFLICT (office_id) DO NOTHING;

INSERT INTO public.credit_transactions (office_id, transaction_type, credits, note)
SELECT id, 'recharge', 150, 'Ricarica iniziale'
FROM public.caf_offices
WHERE name = 'CAF Centro Milano'
AND NOT EXISTS (SELECT 1 FROM public.credit_transactions WHERE note = 'Ricarica iniziale');

INSERT INTO public.credit_payments (office_id, credits, amount, payment_method, reference, status, paid_at)
SELECT id, 150, 150.00, 'Bonifico', 'RIC-2026-001', 'Pagato', now()
FROM public.caf_offices
WHERE name = 'CAF Centro Milano'
AND NOT EXISTS (SELECT 1 FROM public.credit_payments WHERE reference = 'RIC-2026-001');
