/*
# Create staff users and roles management

1. New Tables
- `staff_members` stores the people who use the CAF management workspace.
- `id` is the generated staff member identifier.
- `name` stores the full display name.
- `email` stores the staff email address.
- `phone` stores the optional phone number.
- `role` stores the assigned application role.
- `office` stores the assigned CAF office.
- `payment_permission` stores the payment access level.
- `status` stores whether the staff member is active or inactive.
- `practice_count` stores the number of practices assigned to the staff member.
- `created_at` stores when the staff member was added.

2. Security
- Row level security is enabled.
- Anonymous and authenticated roles can view, add, edit, and remove staff members because this prototype has no sign-in screen.
- Grants and policies cover the CRUD operations used by the management screen.

3. Initial Data
- The six staff rows shown in the existing Utenti e Ruoli design are stored in the database.
- No passwords or authentication credentials are stored in this table.
*/

CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Operatore Ufficio CAF',
  office text NOT NULL DEFAULT 'Nessun ufficio',
  payment_permission text NOT NULL DEFAULT 'N/A',
  status text NOT NULL DEFAULT 'Attivo',
  practice_count integer NOT NULL DEFAULT 0 CHECK (practice_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view staff members" ON public.staff_members;
CREATE POLICY "Public can view staff members"
ON public.staff_members FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can create staff members" ON public.staff_members;
CREATE POLICY "Public can create staff members"
ON public.staff_members FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update staff members" ON public.staff_members;
CREATE POLICY "Public can update staff members"
ON public.staff_members FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete staff members" ON public.staff_members;
CREATE POLICY "Public can delete staff members"
ON public.staff_members FOR DELETE
TO anon, authenticated
USING (true);

INSERT INTO public.staff_members (name, email, phone, role, office, payment_permission, status, practice_count)
VALUES
  ('Jafar Mohammed', 'qidjafar@gmail.com', '', 'Operatore Ufficio CAF', 'Assegnazione obbligatoria', 'Solo Crediti', 'Inattivo', 2),
  ('Md Shawon Ahmed', 'soluzionecentro3@gmail.com', '', 'Operatore Ufficio CAF', 'CAF Prenestina', 'Solo Crediti', 'Attivo', 4),
  ('Md Shawon Ahmed', 'sh awon.soluzionecentro@gmail.com', '349 7654321', 'Amministratore', 'CAF Roma Eur', 'N/A', 'Attivo', 16),
  ('Senayt Ketema', 'ketemasenayt@gmail.com', '', 'In Attesa di Approvazione', 'Nessun ufficio', 'N/A', 'Inattivo', 0),
  ('Wonn', 'wonn1066@gmail.com', '', 'Operatore Ufficio CAF', 'torpignattara', 'Solo Crediti', 'Attivo', 3),
  ('centro soluzioni', 'soluzionecentro@gmail.com', '', 'Operatore Ufficio CAF', 'CAF Roma Eur', 'Solo Crediti', 'Attivo', 5)
ON CONFLICT DO NOTHING;
