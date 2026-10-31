/*
# Create practice records for the Nuova Pratica form

1. New Tables
- `practices` stores each practice submitted from the back-office form.
- `id` is the generated record identifier.
- `client_name` stores the selected client label.
- `category` and `service` store the selected work classification.
- `deadline` stores the optional due date.
- `priority` stores the urgency selection.
- `description` stores notes for the back-office team.
- `amount_received` stores the amount received from the client in euros.
- `payment_status` stores the client payment state.
- `documents` stores selected document names by document type.
- `office` stores the CAF office associated with the record.
- `status` stores the initial workflow status.
- `created_at` stores when the record was created.

2. Security
- Row level security is enabled.
- Anonymous and authenticated roles can create and view records because this prototype has no sign-in screen.
- Grants are limited to the operations used by the form.

3. Important Notes
- Document metadata is stored with the practice so the form remains usable without a separate upload service.
- No existing data is modified or removed.
*/

CREATE TABLE IF NOT EXISTS public.practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  category text NOT NULL,
  service text NOT NULL,
  deadline date,
  priority text NOT NULL DEFAULT 'Normale',
  description text NOT NULL DEFAULT '',
  amount_received numeric(12, 2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Nessun importo',
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  office text NOT NULL DEFAULT 'CAF Roma Eur',
  status text NOT NULL DEFAULT 'Nuova',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.practices TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view practices" ON public.practices;
CREATE POLICY "Public can view practices"
ON public.practices FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can create practices" ON public.practices;
CREATE POLICY "Public can create practices"
ON public.practices FOR INSERT
TO anon, authenticated
WITH CHECK (true);
