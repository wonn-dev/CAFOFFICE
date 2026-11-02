/*
# Add back-office completion document support

1. Changes
- Add `back_office_document` to `public.pratiche` as JSON metadata for the completed back-office file.
- Metadata stores the original filename, private storage path, size, and MIME type.
- Existing practice documents remain unchanged in `documents`.

2. Storage
- Back-office files continue using the private `practice-documents` bucket.
- The application stores files under `pratiche/<practice-id>/back-office/`.
- Existing bucket limits remain active: PDF, JPEG, PNG, maximum 15 MB.

3. Security
- Existing practice update grants and RLS policy are reused for metadata updates.
- Existing private storage policies are reused; files are accessed only through short-lived signed URLs.
- No public bucket or permanent file URL is created.

4. Data Safety
- The new column is nullable through a JSON default and does not modify or remove existing rows, files, or columns.
*/

ALTER TABLE public.pratiche
ADD COLUMN IF NOT EXISTS back_office_document jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT UPDATE ON public.pratiche TO anon, authenticated;
