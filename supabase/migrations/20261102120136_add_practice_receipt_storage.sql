/*
# Add client receipt PDF storage

1. Database Changes
- Add `receipt_document` to `public.pratiche` for the generated receipt PDF metadata.
- Store the original filename, private storage path, file size, and MIME type.
- Existing practice and back-office document metadata remains unchanged.

2. Storage
- Create the private `practice-receipts` bucket for generated client receipts.
- Limit receipts to PDF files up to 15 MB.
- Store receipt objects below `ricevute/<practice-id>/`.

3. Security
- Keep the receipt bucket private.
- Allow the existing single-tenant browser client to upload and request signed receipt URLs only for receipt paths.
- Reuse the existing no-sign-in practice update access to save receipt metadata.

4. Data Safety
- The new JSON column has an empty default and does not modify, remove, or replace existing practices or files.
- Re-running this migration is safe.
*/

ALTER TABLE public.pratiche
ADD COLUMN IF NOT EXISTS receipt_document jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT UPDATE ON public.pratiche TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-receipts',
  'practice-receipts',
  false,
  15728640,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf']::text[];

DROP POLICY IF EXISTS "Practice receipts can be uploaded" ON storage.objects;
CREATE POLICY "Practice receipts can be uploaded"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'practice-receipts'
  AND name LIKE 'ricevute/%'
);

DROP POLICY IF EXISTS "Practice receipts can be viewed" ON storage.objects;
CREATE POLICY "Practice receipts can be viewed"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'practice-receipts'
  AND name LIKE 'ricevute/%'
);

DROP POLICY IF EXISTS "Practice receipts can be replaced" ON storage.objects;
CREATE POLICY "Practice receipts can be replaced"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'practice-receipts'
  AND name LIKE 'ricevute/%'
)
WITH CHECK (
  bucket_id = 'practice-receipts'
  AND name LIKE 'ricevute/%'
);

DROP POLICY IF EXISTS "Practice receipts can be removed" ON storage.objects;
CREATE POLICY "Practice receipts can be removed"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'practice-receipts'
  AND name LIKE 'ricevute/%'
);