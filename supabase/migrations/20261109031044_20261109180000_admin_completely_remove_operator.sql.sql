/*
# Remove operator completely from any office

## Purpose
The existing `admin_delete_staff_member` function only deleted the
`staff_members` row, which fails when an `account_workspaces` row
references it (RESTRICT foreign key). Even when it succeeded, the
user's auth account remained active so the operator could still log in.

## Changes
- Updated `admin_delete_staff_member` to:
  1. Delete the `account_workspaces` row for the staff member's owner
     (removes the office association completely).
  2. Delete the `staff_members` row.
  3. Delete the `auth.users` account by matching `owner_id` to
     `auth.users.id`, so the operator can no longer sign in.
- The function remains SECURITY DEFINER and admin-gated.
- Uses the `owner_id` column on `staff_members` to find the auth user.

## Security
- Only administrators can call this function (existing check preserved).
- Deleting the auth account revokes all access immediately.
- No client-supplied data is used beyond the staff member ID.
*/

CREATE OR REPLACE FUNCTION public.admin_delete_staff_member(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Find the auth user that owns this staff member
  SELECT owner_id INTO v_owner_id
  FROM public.staff_members
  WHERE id = p_member;

  -- Remove the workspace link (office association)
  IF v_owner_id IS NOT NULL THEN
    DELETE FROM public.account_workspaces WHERE user_id = v_owner_id;
  END IF;

  -- Remove the staff member record
  DELETE FROM public.staff_members WHERE id = p_member;

  -- Remove the auth account so the user can no longer sign in
  IF v_owner_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_owner_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_staff_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_member(uuid) TO authenticated;
