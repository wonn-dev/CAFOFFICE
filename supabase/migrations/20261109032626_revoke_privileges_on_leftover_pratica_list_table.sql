/*
  # Revoke client privileges on the leftover "pratica list" table

  1. Problem
     - public."pratica list" has RLS enabled with no policies (so it is
       currently unreachable) yet still carries SELECT/INSERT/UPDATE/DELETE
       grants for anon and authenticated. Any policy added later would be
       instantly backed by full table privileges.

  2. Fix
     - Revoke all privileges from anon and authenticated. The table and any
       rows in it are left untouched.
*/

REVOKE ALL ON TABLE public."pratica list" FROM anon;
REVOKE ALL ON TABLE public."pratica list" FROM authenticated;
