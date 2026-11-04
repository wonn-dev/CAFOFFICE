/*
# Sync practice office and operator details

1. Purpose
- Ensure every practice created by a linked staff account shows the CAF office and operator that created it.
- Correct existing owned practices that still contain the old default office and placeholder operator.

2. Modified table
- `public.pratiche`
- Updates only `office` and `operator` for rows whose `owner_id` matches a staff member's `owner_id`.
- Practices without an owner are preserved because they are legacy records without a reliable creator account.

3. Security
- This is a controlled data correction performed during migration.
- Future practice creation continues to use the signed-in staff context in the application.
- Existing RLS policies and ownership rules are unchanged.

4. Important notes
- No practices, documents, clients, or user accounts are deleted.
- The operator name and office are stored as historical details on the practice so the record remains accurate even if staff details change later.
*/

UPDATE public.pratiche AS practice
SET
  office = staff.office,
  operator = staff.name
FROM public.staff_members AS staff
WHERE practice.owner_id = staff.owner_id
  AND staff.owner_id IS NOT NULL;