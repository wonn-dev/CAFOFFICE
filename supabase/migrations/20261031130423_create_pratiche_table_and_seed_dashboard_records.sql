/*
# Create the complete pratiche table and migrate dashboard records

1. New Tables
- `pratiche` stores every practice shown and created by the application.
- `id` is the generated record identifier.
- `protocol` stores the practice protocol number.
- `client_name` stores the client name.
- `tax_code` stores the client tax code.
- `category` stores the practice category.
- `service` stores the requested service.
- `deadline` stores the optional due date.
- `priority` stores the urgency level.
- `description` stores internal notes.
- `amount_received` stores the amount received from the client.
- `payment_status` stores the client payment state.
- `documents` stores document names by document type.
- `office` stores the associated CAF office.
- `operator` stores the assigned operator.
- `status` stores the workflow status.
- `overdue` stores whether the practice is overdue.
- `created_at` stores when the practice was created.

2. Security
- Row level security is enabled.
- Anonymous and authenticated roles can view and create practices because the app has no sign-in screen.
- Grants and policies cover only the read and create operations currently used by the app.

3. Data Migration
- The five dashboard practice records previously hardcoded in the frontend are inserted into `pratiche`.
- All displayed properties are mapped to dedicated columns.
- The existing `practices` table is not deleted or changed, preventing loss of any records that may already exist there.
*/

CREATE TABLE IF NOT EXISTS public.pratiche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol text NOT NULL UNIQUE DEFAULT ('PRAT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  client_name text NOT NULL,
  tax_code text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Servizio al cittadino',
  service text NOT NULL,
  deadline date,
  priority text NOT NULL DEFAULT 'Normale',
  description text NOT NULL DEFAULT '',
  amount_received numeric(12, 2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Nessun importo',
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  office text NOT NULL DEFAULT 'CAF Roma Eur',
  operator text NOT NULL DEFAULT '—',
  status text NOT NULL DEFAULT 'Nuova',
  overdue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pratiche ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.pratiche TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view pratiche" ON public.pratiche;
CREATE POLICY "Public can view pratiche"
ON public.pratiche FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can create pratiche" ON public.pratiche;
CREATE POLICY "Public can create pratiche"
ON public.pratiche FOR INSERT
TO anon, authenticated
WITH CHECK (true);

INSERT INTO public.pratiche (protocol, client_name, tax_code, category, service, office, operator, status, priority, deadline, overdue, created_at)
VALUES
  ('PRAT-1016', 'Niaj Mohahbd', 'MHNMNJ97L25Z249F', 'Servizio al cittadino', 'Prenotazione Appuntamenti Questura / Prefettura', 'CAF Roma Eur', '—', 'Nuova', 'Urgente', '2026-10-29', true, '2026-10-31T09:00:00.000Z'),
  ('PRAT-1015', 'Md Shawon Ahmed', 'HJJKGHYUUUJH', 'Servizio al cittadino', 'Assegno Unico e Universale (AUU)', 'CAF Roma Eur', '—', 'Completata', 'Normale', '2026-11-03', false, '2026-10-30T09:00:00.000Z'),
  ('PRAT-1014', 'Md Shawon Ahmed', 'HJJKGHYUUUJH', 'Servizio al cittadino', 'Assegno Unico e Universale (AUU)', 'CAF Roma Eur', '—', 'Annullata', 'Normale', '2026-10-11', false, '2026-10-29T09:00:00.000Z'),
  ('PRAT-1013', 'Md Shawon Ahmed', 'HJJKGHYUUUJH', 'Servizio al cittadino', 'Pagamenti PagoPA e Bollettini', 'CAF Roma Eur', '—', 'Annullata', 'Normale', '2026-11-15', false, '2026-10-28T09:00:00.000Z'),
  ('PRAT-1012', 'Md Shawon Ahmed', 'HJJKGHYUUUJH', 'Servizio al cittadino', 'Pagamenti PagoPA e Bollettini', 'CAF Roma Eur', '—', 'Nuova', 'Normale', '2026-11-15', false, '2026-10-27T09:00:00.000Z')
ON CONFLICT (protocol) DO NOTHING;
