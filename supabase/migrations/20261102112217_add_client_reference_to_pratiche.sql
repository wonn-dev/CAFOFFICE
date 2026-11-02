/*
# Link practices to their client records

1. Changes
- Add `client_id` to `public.pratiche` as an optional reference to `public.clients`.
- New practices can reliably display the complete client profile without depending on text matching.
- Existing practices remain readable because the column is nullable and their stored name/tax code are preserved.

2. Security
- Preserve the existing single-tenant, no-sign-in access model.
- Grant no new privileges because existing practice SELECT, INSERT, and UPDATE grants already cover this column.
- Existing RLS policies continue to apply to practice rows.

3. Data Safety
- No rows, files, or existing columns are deleted or changed.
- Existing practices are backfilled only when a client can be matched safely by normalized name and the client reference is currently missing.
*/

ALTER TABLE public.pratiche
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pratiche_client_id_idx ON public.pratiche (client_id);

UPDATE public.pratiche AS practice
SET client_id = client.id
FROM public.clients AS client
WHERE practice.client_id IS NULL
  AND lower(regexp_replace(trim(practice.client_name), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(client.first_name || ' ' || client.last_name), '\\s+', ' ', 'g'));
