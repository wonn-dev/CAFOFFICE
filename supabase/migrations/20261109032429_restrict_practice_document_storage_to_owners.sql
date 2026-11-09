/*
  # Bind practice document storage to practice ownership

  1. Problem
     - The three `practice-documents` policies matched only bucket + `pratiche/%`
       path prefix, so any authenticated user could download, delete or plant
       files belonging to any other office's practices. Only the
       `back-office/` subfolder was admin-restricted.

  2. Fix
     - Recreate SELECT/INSERT/DELETE bound to the owning practice via the
       `pratiche/<practice_id>/` path segment (owner or administrator).
     - Retain the existing back-office admin carve-out on writes.
     - INSERT/DELETE tolerate a missing practice row, because the client uploads
       documents before inserting the practice and removes them again if the
       insert fails.
*/

DROP POLICY IF EXISTS "Practice documents can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Practice documents can be viewed" ON storage.objects;
DROP POLICY IF EXISTS "Practice documents can be removed" ON storage.objects;

CREATE POLICY "Practice documents can be viewed"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'practice-documents'
    AND public.can_access_practice_files(public.storage_path_practice_id(name, 'pratiche'))
  );

CREATE POLICY "Practice documents can be uploaded"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'practice-documents'
    AND public.storage_path_practice_id(name, 'pratiche') IS NOT NULL
    AND (name !~ '^pratiche/[^/]+/back-office/' OR public.is_current_user_admin())
    AND (
      public.can_access_practice_files(public.storage_path_practice_id(name, 'pratiche'))
      OR public.practice_row_absent(public.storage_path_practice_id(name, 'pratiche'))
    )
  );

CREATE POLICY "Practice documents can be removed"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'practice-documents'
    AND public.storage_path_practice_id(name, 'pratiche') IS NOT NULL
    AND (name !~ '^pratiche/[^/]+/back-office/' OR public.is_current_user_admin())
    AND (
      public.can_access_practice_files(public.storage_path_practice_id(name, 'pratiche'))
      OR public.practice_row_absent(public.storage_path_practice_id(name, 'pratiche'))
    )
  );
