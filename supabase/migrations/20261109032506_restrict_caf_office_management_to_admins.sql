/*
  # Restrict CAF office management to administrators

  1. Problem
     - `caf_offices` allowed any authenticated user to INSERT a row (owner_id
       defaults to auth.uid(), satisfying the WITH CHECK) and then UPDATE every
       column of it, including `can_pay_later`. Combined with the ability to
       re-point their own workspace, a non-admin could grant themselves
       pay-later and create practices without spending credits.
     - The same INSERT grant let any signed-in user publish fake offices into
       the public registration dropdown served by list_registration_offices().

  2. Fix
     - INSERT, UPDATE and DELETE on `caf_offices` now require
       is_current_user_admin(). SELECT is unchanged so existing operator screens
       keep working.

  3. Notes
     - Administrator office management continues to work: is_current_user_admin()
       is true for staff with role 'Amministratore' and status 'Attivo'.
*/

DROP POLICY IF EXISTS "Authenticated users can create caf offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Permitted users can update caf offices" ON public.caf_offices;
DROP POLICY IF EXISTS "Permitted users can delete caf offices" ON public.caf_offices;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'caf_offices' AND p.polcmd <> 'r'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.caf_offices', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Admins can create caf offices"
  ON public.caf_offices FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update caf offices"
  ON public.caf_offices FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete caf offices"
  ON public.caf_offices FOR DELETE TO authenticated
  USING (public.is_current_user_admin());
