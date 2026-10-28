-- Migration: 20260607150000_harden_developer_and_system_roles.sql

-- 1. Mark Core System Roles as System Roles
UPDATE public.roles
SET is_system_role = true
WHERE name IN ('Developer', 'Administrator', 'Accountant', 'Security', 'Property Manager');

-- 2. Create Developer Role Constraint Trigger
CREATE OR REPLACE FUNCTION public.check_staff_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  dev_role_id UUID;
  dev_staff_id UUID;
BEGIN
  -- Find developer role ID
  SELECT id INTO dev_role_id FROM public.roles WHERE name = 'Developer';
  
  -- If assigning the Developer role
  IF NEW.role_id = dev_role_id THEN
    -- Get the developer staff ID from settings
    SELECT setting_value::UUID INTO dev_staff_id FROM public.system_settings WHERE setting_key = 'developer_staff_id';
    
    -- Only allow if the staff being assigned is the developer staff ID
    IF NEW.staff_id <> dev_staff_id THEN
      RAISE EXCEPTION 'Unauthorized: The Developer role can only be assigned to the system developer account.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_staff_role_assignment ON public.staff_roles;
CREATE TRIGGER trg_check_staff_role_assignment
BEFORE INSERT OR UPDATE ON public.staff_roles
FOR EACH ROW EXECUTE FUNCTION public.check_staff_role_assignment();

-- 3. Introduce is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.staff s
    JOIN public.staff_roles sr ON sr.staff_id = s.id
    JOIN public.roles r ON r.id = sr.role_id
    WHERE s.user_id = auth.uid()
      AND s.is_active = true
      AND (r.permissions->>'all')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 4. Harden RLS Policies to restrict writes on roles, staff, and staff_roles to Administrators only
-- roles table write policies
DROP POLICY IF EXISTS roles_insert ON public.roles;
CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS roles_update ON public.roles;
CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS roles_delete ON public.roles;
CREATE POLICY roles_delete ON public.roles FOR DELETE TO authenticated USING (public.is_admin());

-- staff table write policies
DROP POLICY IF EXISTS staff_insert ON public.staff;
CREATE POLICY staff_insert ON public.staff FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS staff_update ON public.staff;
CREATE POLICY staff_update ON public.staff FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS staff_delete ON public.staff;
CREATE POLICY staff_delete ON public.staff FOR DELETE TO authenticated USING (public.is_admin());

-- staff_roles table write policies
DROP POLICY IF EXISTS staff_roles_insert ON public.staff_roles;
CREATE POLICY staff_roles_insert ON public.staff_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS staff_roles_update ON public.staff_roles;
CREATE POLICY staff_roles_update ON public.staff_roles FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS staff_roles_delete ON public.staff_roles;
CREATE POLICY staff_roles_delete ON public.staff_roles FOR DELETE TO authenticated USING (public.is_admin());
