-- Secure remaining security definer functions

-- 1. Secure is_property_owner (RLS helper)
-- Needs to be executable by authenticated users for RLS, but NOT by anon
REVOKE EXECUTE ON FUNCTION public.is_property_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_property_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_property_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_property_owner(uuid) TO service_role;

-- 2. Secure calculate_water_bill (trigger function)
-- Trigger functions should only be executed by Postgres/service_role
REVOKE EXECUTE ON FUNCTION public.calculate_water_bill() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_water_bill() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_water_bill() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_water_bill() TO service_role;

-- 3. Secure handle_audit_log (trigger function)
-- Trigger functions should only be executed by Postgres/service_role
REVOKE EXECUTE ON FUNCTION public.handle_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_audit_log() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_audit_log() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_audit_log() TO service_role;

-- 4. Secure authenticate_resident (custom auth RPC)
-- Called from Next.js server side using service_role client
REVOKE EXECUTE ON FUNCTION public.authenticate_resident(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.authenticate_resident(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.authenticate_resident(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_resident(text, text, text) TO service_role;
