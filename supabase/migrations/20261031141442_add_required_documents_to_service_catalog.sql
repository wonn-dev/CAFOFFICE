/*
# Add required documents to services

1. Modified Tables
- `service_catalog` gains `required_documents`.
- `required_documents` stores the documents needed for the selected service, one document per line, and defaults to an empty value for existing services.

2. Security
- Existing row-level security policies and Data API grants remain unchanged.
- The existing shared-catalog CRUD access continues to apply to the new field.

3. Important Notes
- Existing service records are preserved.
- The field is edited from the service form and shown as configured or not configured in the service list.
*/

ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS required_documents text NOT NULL DEFAULT '';
