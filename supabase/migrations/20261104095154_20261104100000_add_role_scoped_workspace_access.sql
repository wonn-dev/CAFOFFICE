/*
# Add role-scoped workspace access

1. Purpose
- Separate administrator access from operator access in the CAF workspace.
- Keep authorization in Supabase policies and protected functions, not only in the navigation.

2. New Ownership Columns
- `pratiche.owner_id` and `practices.owner_id` identify the account that created a practice.
- `agenda_events.owner_id` identifies the account that created an agenda event.
- Existing rows keep a null owner and remain available to administrators as legacy records.

3. Role Resolution
- Add protected functions that resolve the signed-in staff member through `account_workspaces`.
- The existing administrator account is linked to the existing administrator staff row using the matching administrator account email pattern.
- New registrations continue to receive the operator role and pending status from the registration function.

4. Access Rules
- Administrators can see and manage all practices, agenda events, offices, staff records, service configuration, and credit records.
- Operators can create and see only their own practices and agenda events.
- Operators can see and manage only their own client records; administrators cannot see another user's client records.
- Operators can read the shared service catalog needed for creating a practice, but cannot change it.
- Credit and payment records are administrator-only until that section is implemented.
- Anonymous access remains disabled.

5. Staff Management Security
- Staff role, status, payment permission, and practice count cannot be changed through direct browser table writes.
- Administrator-only functions handle staff creation, updates, and deletion after checking the caller's server-side role.

6. Data Safety
- No rows are deleted.
- Existing practices, clients, agenda events, offices, staff, services, and credit records are preserved.
- Existing legacy practice rows are not assigned to operators and remain visible to administrators.
*/

ALTER TABLE public.pratiche
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.pratiche
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.practices
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.agenda_events
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS pratiche_owner_id_idx ON public.pratiche (owner_id);
CREATE INDEX IF NOT EXISTS practices_owner_id_idx ON public.practices (owner_id);
CREATE INDEX IF NOT EXISTS agenda_events_owner_id_idx ON public.agenda_events (owner_id);

UPDATE public.staff_members AS staff
SET owner_id = users.id
FROM auth.users AS users
WHERE staff.owner_id IS NULL
  AND staff.role = 'Amministratore'
  AND staff.name = 'Md Shawon Ahmed'
  AND lower(users.email) LIKE 'shawon.%';

INSERT INTO public.account_workspaces (user_id, office_id, staff_id, client_id)
SELECT users.id, office.id, staff.id, NULL
FROM auth.users AS users
JOIN public.staff_members AS staff
  ON staff.owner_id = users.id
  AND staff.role = 'Amministratore'
JOIN public.caf_offices AS office
  ON office.name = staff.office
ON CONFLICT (user_id) DO UPDATE
SET staff_id = EXCLUDED.staff_id,
    office_id = EXCLUDED.office_id;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_workspaces AS workspace
    JOIN public.staff_members AS staff ON staff.id = workspace.staff_id
    WHERE workspace.user_id = auth.uid()
      AND staff.role = 'Amministratore'
      AND staff.status = 'Attivo'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_staff_context()
RETURNS TABLE (role text, staff_name text, office text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT staff.role, staff.name, staff.office, staff.status
  FROM public.account_workspaces AS workspace
  JOIN public.staff_members AS staff ON staff.id = workspace.staff_id
  WHERE workspace.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_staff_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_staff_context() TO authenticated;

ALTER TABLE public.pratiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caf_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pratiche FROM anon;
REVOKE INSERT, UPDATE ON public.pratiche FROM authenticated;
GRANT SELECT, DELETE ON public.pratiche TO authenticated;
GRANT INSERT (protocol, client_name, tax_code, category, service, deadline, priority, description, amount_received, payment_status, documents, back_office_document, receipt_document, office, operator, status, overdue, client_id) ON public.pratiche TO authenticated;
GRANT UPDATE (protocol, client_name, tax_code, category, service, deadline, priority, description, amount_received, payment_status, documents, back_office_document, receipt_document, office, operator, status, overdue, client_id) ON public.pratiche TO authenticated;

DROP POLICY IF EXISTS "Public can view pratiche" ON public.pratiche;
DROP POLICY IF EXISTS "Public can create pratiche" ON public.pratiche;
DROP POLICY IF EXISTS "Public can update pratiche documents" ON public.pratiche;
DROP POLICY IF EXISTS "Authenticated users can view permitted pratiche" ON public.pratiche;
DROP POLICY IF EXISTS "Authenticated users can create own pratiche" ON public.pratiche;
DROP POLICY IF EXISTS "Permitted users can update pratiche" ON public.pratiche;
DROP POLICY IF EXISTS "Permitted users can delete pratiche" ON public.pratiche;

CREATE POLICY "Authenticated users can view permitted pratiche" ON public.pratiche FOR SELECT TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Authenticated users can create own pratiche" ON public.pratiche FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Permitted users can update pratiche" ON public.pratiche FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Permitted users can delete pratiche" ON public.pratiche FOR DELETE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());

REVOKE ALL ON public.practices FROM anon;
REVOKE INSERT, UPDATE ON public.practices FROM authenticated;
GRANT SELECT, DELETE ON public.practices TO authenticated;
GRANT INSERT (client_name, category, service, deadline, priority, description, amount_received, payment_status, documents, office, status) ON public.practices TO authenticated;
GRANT UPDATE (client_name, category, service, deadline, priority, description, amount_received, payment_status, documents, office, status) ON public.practices TO authenticated;

DROP POLICY IF EXISTS "Public can view practices" ON public.practices;
DROP POLICY IF EXISTS "Public can create practices" ON public.practices;
DROP POLICY IF EXISTS "Authenticated users can view permitted practices" ON public.practices;
DROP POLICY IF EXISTS "Authenticated users can create own practices" ON public.practices;
DROP POLICY IF EXISTS "Permitted users can update practices" ON public.practices;
DROP POLICY IF EXISTS "Permitted users can delete practices" ON public.practices;

CREATE POLICY "Authenticated users can view permitted practices" ON public.practices FOR SELECT TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Authenticated users can create own practices" ON public.practices FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Permitted users can update practices" ON public.practices FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Permitted users can delete practices" ON public.practices FOR DELETE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());

REVOKE ALL ON public.agenda_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.agenda_events FROM authenticated;
GRANT SELECT, DELETE ON public.agenda_events TO authenticated;
GRANT INSERT (title, work_type, event_date, start_time, end_time, office, notes, reminder_enabled, reminder_minutes, status, updated_at) ON public.agenda_events TO authenticated;
GRANT UPDATE (title, work_type, event_date, start_time, end_time, office, notes, reminder_enabled, reminder_minutes, status, updated_at) ON public.agenda_events TO authenticated;

DROP POLICY IF EXISTS "Public can view agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Public can create agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Public can update agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Public can delete agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Authenticated users can view permitted agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Authenticated users can create own agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Permitted users can update agenda events" ON public.agenda_events;
DROP POLICY IF EXISTS "Permitted users can delete agenda events" ON public.agenda_events;

CREATE POLICY "Authenticated users can view permitted agenda events" ON public.agenda_events FOR SELECT TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Authenticated users can create own agenda events" ON public.agenda_events FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Permitted users can update agenda events" ON public.agenda_events FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_current_user_admin() OR owner_id = auth.uid());
CREATE POLICY "Permitted users can delete agenda events" ON public.agenda_events FOR DELETE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view shared or own clients" ON public.clients;
CREATE POLICY "Authenticated users can view own clients" ON public.clients FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can update own clients" ON public.clients;
CREATE POLICY "Authenticated users can update own clients" ON public.clients FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view shared or own CAF offices" ON public.caf_offices;
CREATE POLICY "Authenticated users can view permitted CAF offices" ON public.caf_offices FOR SELECT TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can update own CAF offices" ON public.caf_offices;
CREATE POLICY "Permitted users can update CAF offices" ON public.caf_offices FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_current_user_admin() OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can delete own CAF offices" ON public.caf_offices;
CREATE POLICY "Permitted users can delete CAF offices" ON public.caf_offices FOR DELETE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());

REVOKE ALL ON public.staff_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.staff_members FROM authenticated;
GRANT SELECT ON public.staff_members TO authenticated;
GRANT INSERT (name, email, phone, office, payment_permission) ON public.staff_members TO authenticated;
GRANT UPDATE (name, email, phone, office, payment_permission) ON public.staff_members TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view shared or own staff members" ON public.staff_members;
CREATE POLICY "Permitted users can view staff members" ON public.staff_members FOR SELECT TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can create own staff members" ON public.staff_members;
CREATE POLICY "Authenticated users can create own staff members" ON public.staff_members FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can update own staff members" ON public.staff_members;
CREATE POLICY "Permitted users can update staff members" ON public.staff_members FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_current_user_admin() OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can delete own staff members" ON public.staff_members;
CREATE POLICY "Permitted users can delete staff members" ON public.staff_members FOR DELETE TO authenticated USING (public.is_current_user_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Public can view service catalog" ON public.service_catalog;
CREATE POLICY "Authenticated users can view service catalog" ON public.service_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Public can create service catalog" ON public.service_catalog;
CREATE POLICY "Administrators can create service catalog" ON public.service_catalog FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update service catalog" ON public.service_catalog;
CREATE POLICY "Administrators can update service catalog" ON public.service_catalog FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete service catalog" ON public.service_catalog;
CREATE POLICY "Administrators can delete service catalog" ON public.service_catalog FOR DELETE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
CREATE POLICY "Authenticated users can view service categories" ON public.service_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Public can create service categories" ON public.service_categories;
CREATE POLICY "Administrators can create service categories" ON public.service_categories FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update service categories" ON public.service_categories;
CREATE POLICY "Administrators can update service categories" ON public.service_categories FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete service categories" ON public.service_categories;
CREATE POLICY "Administrators can delete service categories" ON public.service_categories FOR DELETE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can view office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Administrators can view office credit accounts" ON public.office_credit_accounts FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can create office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Administrators can create office credit accounts" ON public.office_credit_accounts FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Administrators can update office credit accounts" ON public.office_credit_accounts FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete office credit accounts" ON public.office_credit_accounts;
CREATE POLICY "Administrators can delete office credit accounts" ON public.office_credit_accounts FOR DELETE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can view credit requests" ON public.credit_requests;
CREATE POLICY "Administrators can view credit requests" ON public.credit_requests FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can create credit requests" ON public.credit_requests;
CREATE POLICY "Administrators can create credit requests" ON public.credit_requests FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update credit requests" ON public.credit_requests;
CREATE POLICY "Administrators can update credit requests" ON public.credit_requests FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete credit requests" ON public.credit_requests;
CREATE POLICY "Administrators can delete credit requests" ON public.credit_requests FOR DELETE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can view credit payments" ON public.credit_payments;
CREATE POLICY "Administrators can view credit payments" ON public.credit_payments FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can create credit payments" ON public.credit_payments;
CREATE POLICY "Administrators can create credit payments" ON public.credit_payments FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update credit payments" ON public.credit_payments;
CREATE POLICY "Administrators can update credit payments" ON public.credit_payments FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete credit payments" ON public.credit_payments;
CREATE POLICY "Administrators can delete credit payments" ON public.credit_payments FOR DELETE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can view credit transactions" ON public.credit_transactions;
CREATE POLICY "Administrators can view credit transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can create credit transactions" ON public.credit_transactions;
CREATE POLICY "Administrators can create credit transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can update credit transactions" ON public.credit_transactions;
CREATE POLICY "Administrators can update credit transactions" ON public.credit_transactions FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Public can delete credit transactions" ON public.credit_transactions;
CREATE POLICY "Administrators can delete credit transactions" ON public.credit_transactions FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.admin_create_staff_member(
  p_name text, p_email text, p_phone text, p_role text, p_office text,
  p_payment_permission text, p_status text, p_practice_count integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role NOT IN ('Amministratore', 'Operatore Back-Office', 'Admin Ufficio CAF', 'Operatore Ufficio CAF', 'In Attesa di Approvazione') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_status NOT IN ('Attivo', 'Inattivo', 'In Attesa di Approvazione') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_practice_count IS NULL OR p_practice_count < 0 THEN RAISE EXCEPTION 'Invalid practice count'; END IF;
  INSERT INTO public.staff_members (name, email, phone, role, office, payment_permission, status, practice_count)
  VALUES (trim(p_name), lower(trim(p_email)), trim(p_phone), p_role, trim(p_office), p_payment_permission, p_status, p_practice_count)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_staff_member(
  p_member uuid, p_name text, p_email text, p_phone text, p_role text, p_office text,
  p_payment_permission text, p_status text, p_practice_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role NOT IN ('Amministratore', 'Operatore Back-Office', 'Admin Ufficio CAF', 'Operatore Ufficio CAF', 'In Attesa di Approvazione') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_status NOT IN ('Attivo', 'Inattivo', 'In Attesa di Approvazione') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_practice_count IS NULL OR p_practice_count < 0 THEN RAISE EXCEPTION 'Invalid practice count'; END IF;
  UPDATE public.staff_members
  SET name = trim(p_name), email = lower(trim(p_email)), phone = trim(p_phone), role = p_role,
      office = trim(p_office), payment_permission = p_payment_permission, status = p_status,
      practice_count = p_practice_count
  WHERE id = p_member;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_staff_member(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.staff_members WHERE id = p_member;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_staff_member(text, text, text, text, text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_staff_member(uuid, text, text, text, text, text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_staff_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_staff_member(text, text, text, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_member(uuid, text, text, text, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_member(uuid) TO authenticated;