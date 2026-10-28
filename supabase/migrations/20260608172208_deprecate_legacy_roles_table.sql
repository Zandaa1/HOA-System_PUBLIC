-- Migration: 20260608172208_deprecate_legacy_roles_table.sql
-- Drop the legacy roles and staff_roles tables since permission checklists
-- are now stored directly on the staff table.

-- Drop constraints, triggers, functions, and tables
DROP TRIGGER IF EXISTS trg_check_staff_role_assignment ON public.staff_roles;
DROP FUNCTION IF EXISTS public.check_staff_role_assignment();

DROP TABLE IF EXISTS public.staff_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
