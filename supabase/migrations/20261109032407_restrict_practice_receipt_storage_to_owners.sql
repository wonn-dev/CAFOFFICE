/*
  # Bind practice receipt storage to practice ownership

  1. Problem
     - All four `practice-receipts` policies were granted to `anon` as well as
       `authenticated`, with predicates matching only bucket + `ricevute/%` path
       prefix. Anyone holding the public anon key could list, download, replace
       and delete every receipt PDF in the system.

  2. Fix
     - Drop the four permissive policies.
     - Recreate them for `authenticated` only, bound to the owning practice via
       the `ricevute/<practice_id>/` path segment, allowing the practice owner
       and administrators.
     - INSERT/DELETE additionally tolerate a missing practice row so the client's
       upload-rollback path keeps working.

  3. Notes
     - No data is touched; only policies change.
*/

CREATE OR REPLACE FUNCTION public.storage_path_practice_id(p_name text, p_prefix text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
SELECT CASE
  WHEN p_name ~ ('^' || p_prefix || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/')
  THEN split_part(p_name, '/', 2)::uuid
  ELSE NULL
END;
$$;

REVOKE EXECUTE ON FUNCTION public.storage_path_practice_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_path_practice_id(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_practice_files(p_practice uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT p_practice IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.pratiche AS pr
    WHERE pr.id = p_practice
      AND (pr.owner_id = auth.uid() OR public.is_current_user_admin())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_practice_files(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_practice_files(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.practice_row_absent(p_practice uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT NOT EXISTS (SELECT 1 FROM public.pratiche AS pr WHERE pr.id = p_practice);
$$;

REVOKE EXECUTE ON FUNCTION public.practice_row_absent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.practice_row_absent(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Practice receipts can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Practice receipts can be viewed" ON storage.objects;
DROP POLICY IF EXISTS "Practice receipts can be replaced" ON storage.objects;
DROP POLICY IF EXISTS "Practice receipts can be removed" ON storage.objects;

CREATE POLICY "Practice receipts can be viewed"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'practice-receipts'
    AND public.can_access_practice_files(public.storage_path_practice_id(name, 'ricevute'))
  );

CREATE POLICY "Practice receipts can be uploaded"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'practice-receipts'
    AND public.storage_path_practice_id(name, 'ricevute') IS NOT NULL
    AND (
      public.can_access_practice_files(public.storage_path_practice_id(name, 'ricevute'))
      OR public.practice_row_absent(public.storage_path_practice_id(name, 'ricevute'))
    )
  );

CREATE POLICY "Practice receipts can be replaced"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'practice-receipts'
    AND public.can_access_practice_files(public.storage_path_practice_id(name, 'ricevute'))
  )
  WITH CHECK (
    bucket_id = 'practice-receipts'
    AND public.can_access_practice_files(public.storage_path_practice_id(name, 'ricevute'))
  );

CREATE POLICY "Practice receipts can be removed"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'practice-receipts'
    AND public.storage_path_practice_id(name, 'ricevute') IS NOT NULL
    AND (
      public.can_access_practice_files(public.storage_path_practice_id(name, 'ricevute'))
      OR public.practice_row_absent(public.storage_path_practice_id(name, 'ricevute'))
    )
  );
