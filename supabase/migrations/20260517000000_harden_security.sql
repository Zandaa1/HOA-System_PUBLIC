-- Harden Security for HOA System

-- 1. Secure is_staff function
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO service_role;

-- 2. Harden RLS Policies
-- We'll use a DO block for sequential execution if needed, but standard SQL is cleaner here.

-- Helper to check if user owns a property (already defined in core functions)

-- Generic hardening for Staff-only tables (INSERT/UPDATE/DELETE)
-- We'll explicitly list them to be sure.

DO $$
DECLARE
    t text;
    tables_staff_only text[] := ARRAY[
        'advance_deposits', 'amenities', 'amenity_schedules', 'billing_periods', 
        'custom_field_definitions', 'discounts', 'fee_types', 'homeowners', 
        'invoices', 'invoice_items', 'payments', 'penalties', 'properties', 
        'property_types', 'renters', 'roles', 'staff', 'staff_roles', 
        'system_settings', 'water_bills', 'water_meters', 'water_rates', 
        'water_readings'
    ];
BEGIN
    FOREACH t IN ARRAY tables_staff_only LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff())', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_staff())', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_staff())', t, t);
    END LOOP;
END $$;

-- 3. Specialized Policies for Residents

-- amenity_bookings: Staff can do anything, Residents can insert for their property and view their property's bookings
DROP POLICY IF EXISTS "amenity_bookings_insert" ON public.amenity_bookings;
CREATE POLICY "amenity_bookings_insert" ON public.amenity_bookings FOR INSERT TO authenticated 
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

DROP POLICY IF EXISTS "amenity_bookings_select" ON public.amenity_bookings;
CREATE POLICY "amenity_bookings_select" ON public.amenity_bookings FOR SELECT TO authenticated 
USING (public.is_staff() OR public.is_property_owner(property_id));

-- vehicles: Residents can view and manage their own vehicles? 
-- Usually vehicles are managed by staff for stickers, but let's allow residents to view.
DROP POLICY IF EXISTS "vehicles_insert" ON public.vehicles;
CREATE POLICY "vehicles_insert" ON public.vehicles FOR INSERT TO authenticated 
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated 
USING (public.is_staff() OR public.is_property_owner(property_id));

-- audit_logs: Only staff can view
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff()); 
-- Note: Audit log triggers are SECURITY DEFINER, so they bypass RLS and will still work.

-- payments: Residents can view their own property payments
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated 
USING (public.is_staff() OR EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id AND public.is_property_owner(i.property_id)
));

-- 4. Storage Security
-- Drop broad Public Access policy on storage.objects.
-- Since the 'attachments' bucket is PUBLIC, objects are still accessible via URL,
-- but removing the SELECT policy prevents broad listing of all files.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
