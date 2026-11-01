/*
# Allow failed practice-upload cleanup

1. Security
- Allows the no-sign-in application to remove only objects inside the practice-documents bucket and `pratiche/` path.
- This is used only to remove files when creating a practice fails after an upload.

2. Data Safety
- No database rows or existing files are deleted by this migration.
- Normal practice files remain private and are accessed through signed URLs.
*/

DROP POLICY IF EXISTS "Practice documents can be removed" ON storage.objects;
CREATE POLICY "Practice documents can be removed"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
);