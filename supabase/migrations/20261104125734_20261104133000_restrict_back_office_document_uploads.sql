/*
# Restrict back-office document submission to administrators

1. Purpose
- Make the administrator the only role allowed to submit or replace the completed back-office file.
- Allow signed-in users who can view a practice to open its completed back-office file.

2. Modified table
- `public.pratiche`
- Remove direct INSERT and UPDATE access to `back_office_document` for ordinary authenticated clients.
- Add the `admin_set_back_office_document` function as the controlled write path.

3. Modified storage policies
- `storage.objects` in bucket `practice-documents`
- Only authenticated users can access practice documents.
- Initial practice documents remain uploadable through the existing practice flow.
- Paths under `pratiche/<practice-id>/back-office/` can be uploaded or removed only by administrators.
- Signed-in users retain read access to practice document paths so permitted users can view completed files.

4. Security
- The database function checks the caller with `is_current_user_admin()` and validates that the metadata path belongs to the target practice's back-office folder.
- Anonymous users cannot upload, delete, or read practice documents.
- Existing practice row visibility and ownership policies remain unchanged.

5. Important notes
- Hiding the file picker is only the user-interface behavior; the storage policy and database function enforce the same rule server-side.
- No existing document or practice is deleted.
*/

REVOKE INSERT (back_office_document) ON public.pratiche FROM authenticated;
REVOKE UPDATE (back_office_document) ON public.pratiche FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_back_office_document(
  p_practice_id uuid,
  p_document jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF jsonb_typeof(p_document) <> 'object'
    OR coalesce(p_document->>'path', '') !~ ('^pratiche/' || p_practice_id::text || '/back-office/') THEN
    RAISE EXCEPTION 'Invalid back-office document';
  END IF;

  UPDATE public.pratiche
  SET back_office_document = p_document
  WHERE id = p_practice_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_back_office_document(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_back_office_document(uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Practice documents can be uploaded" ON storage.objects;
CREATE POLICY "Practice documents can be uploaded"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
  AND (
    name !~ '^pratiche/[^/]+/back-office/'
    OR is_current_user_admin()
  )
);

DROP POLICY IF EXISTS "Practice documents can be viewed" ON storage.objects;
CREATE POLICY "Practice documents can be viewed"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
);

DROP POLICY IF EXISTS "Practice documents can be removed" ON storage.objects;
CREATE POLICY "Practice documents can be removed"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
  AND (
    name !~ '^pratiche/[^/]+/back-office/'
    OR is_current_user_admin()
  )
);