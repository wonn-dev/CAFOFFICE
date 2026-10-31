/*
# Create CAF office management

1. New Tables
- `caf_offices` stores the CAF offices that work with the organization.
- `id` is the generated office identifier.
- `name` stores the office name.
- `address` stores the office address.
- `vat_number` stores the VAT/tax identifier.
- `email` stores the office contact email.
- `phone` stores the office contact phone number.
- `is_active` controls whether the office is active or deactivated.
- `created_at` stores when the office was added.

2. Security
- Row level security is enabled.
- Anonymous and authenticated roles can view, add, edit, deactivate, and remove offices because this app has no sign-in screen.
- Grants and policies are limited to the operations used by the office manager.

3. Important Notes
- Four initial offices are added so the management screen is populated immediately.
- No existing tables or records are modified or removed.
*/

CREATE TABLE IF NOT EXISTS public.caf_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  vat_number text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caf_offices_name_key UNIQUE (name)
);

ALTER TABLE public.caf_offices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caf_offices TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view CAF offices" ON public.caf_offices;
CREATE POLICY "Public can view CAF offices"
ON public.caf_offices FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can create CAF offices" ON public.caf_offices;
CREATE POLICY "Public can create CAF offices"
ON public.caf_offices FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update CAF offices" ON public.caf_offices;
CREATE POLICY "Public can update CAF offices"
ON public.caf_offices FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete CAF offices" ON public.caf_offices;
CREATE POLICY "Public can delete CAF offices"
ON public.caf_offices FOR DELETE
TO anon, authenticated
USING (true);

INSERT INTO public.caf_offices (name, address, vat_number, email, phone)
VALUES
  ('CAF Centro Milano', 'Via Dante 12, Milano', 'IT01234567890', 'info@cafmilano.it', '+39 02 1234567'),
  ('CAF PRENESTINA', 'VIA PRENESTINA', '', '', ''),
  ('CAF Roma Eur', 'Viale Europa 45, Roma', 'IT09876543210', 'contatti@cafroma.it', '+39 06 7654321'),
  ('torpignattara', 'via di torpignattara', '', '', '')
ON CONFLICT (name) DO NOTHING;
