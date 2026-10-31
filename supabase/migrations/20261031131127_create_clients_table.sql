/*
# Create client management

1. New Tables
- `clients` stores the people managed by the CAF.
- `id` is the generated client identifier.
- `first_name` and `last_name` store the client name.
- `tax_code` stores the codice fiscale.
- `email` and `phone` store contact details.
- `notes` stores internal notes.
- `address` stores the street address.
- `street_number` stores the civic number.
- `postal_code` stores the CAP.
- `city` stores the comune.
- `province` stores the province.
- `province_code` stores the province abbreviation.
- `region` stores the region.
- `country` stores the country.
- `office` stores the associated CAF office.
- `created_at` stores when the client was added.

2. Security
- Row level security is enabled.
- Anonymous and authenticated roles can view, add, edit, and remove clients because the app has no sign-in screen.
- Grants and policies are limited to the operations used by client management.

3. Important Notes
- Address fields are stored separately so they can be edited and displayed cleanly.
- No existing tables or records are modified or removed.
*/

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  tax_code text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  street_number text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  province_code text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Italia',
  office text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view clients" ON public.clients;
CREATE POLICY "Public can view clients"
ON public.clients FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can create clients" ON public.clients;
CREATE POLICY "Public can create clients"
ON public.clients FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update clients" ON public.clients;
CREATE POLICY "Public can update clients"
ON public.clients FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete clients" ON public.clients;
CREATE POLICY "Public can delete clients"
ON public.clients FOR DELETE
TO anon, authenticated
USING (true);
