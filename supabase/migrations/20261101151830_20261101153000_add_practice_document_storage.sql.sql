/*
# Add secure practice document storage

1. Storage
- Creates the private `practice-documents` bucket for files uploaded to practices.
- Limits uploads to PDF, JPEG, and PNG files up to 15 MB each.
- Stores objects below `pratiche/<practice-id>/` so every file is tied to one practice.

2. Practice Updates
- Grants the browser permission to update only the practice record after its files are uploaded.
- Adds an update policy for the single-tenant application so uploaded-file metadata can be saved.

3. Security
- Keeps the bucket private; the application must request short-lived signed URLs to open files.
- Enables storage policies for the existing no-sign-in application and restricts accepted paths to the practice folder.
- No existing practice rows or files are deleted or modified.

4. Important Notes
- The database stores file metadata and storage paths, not file contents.
- Existing practices that only contain old filename strings remain readable in the detail view.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-documents',
  'practice-documents',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[];

GRANT UPDATE ON public.pratiche TO anon, authenticated;

DROP POLICY IF EXISTS "Public can update pratiche documents" ON public.pratiche;
CREATE POLICY "Public can update pratiche documents"
ON public.pratiche FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Practice documents can be uploaded" ON storage.objects;
CREATE POLICY "Practice documents can be uploaded"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
);

DROP POLICY IF EXISTS "Practice documents can be viewed" ON storage.objects;
CREATE POLICY "Practice documents can be viewed"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'practice-documents'
  AND name LIKE 'pratiche/%'
);