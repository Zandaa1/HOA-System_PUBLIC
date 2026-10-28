-- Migration to resolve database linter issues

-- 1. Explicitly define search_path on functions to prevent search_path mutable warnings (0011)
ALTER FUNCTION public.check_booking_overlap() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_audit_log() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_property_occupancy_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_water_bill() SET search_path = public, pg_temp;


-- 2. Secure RLS policies that were overly permissive with USING/WITH CHECK true (0024)

-- public.amenity_bookings
DROP POLICY IF EXISTS "amenity_bookings_update" ON public.amenity_bookings;
CREATE POLICY "amenity_bookings_update" ON public.amenity_bookings FOR UPDATE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id))
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

DROP POLICY IF EXISTS "amenity_bookings_delete" ON public.amenity_bookings;
CREATE POLICY "amenity_bookings_delete" ON public.amenity_bookings FOR DELETE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

-- public.vehicles
DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
CREATE POLICY "vehicles_update" ON public.vehicles FOR UPDATE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id))
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;
CREATE POLICY "vehicles_delete" ON public.vehicles FOR DELETE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

-- public.custom_field_values
DROP POLICY IF EXISTS "custom_field_values_insert" ON public.custom_field_values;
CREATE POLICY "custom_field_values_insert" ON public.custom_field_values FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "custom_field_values_update" ON public.custom_field_values;
CREATE POLICY "custom_field_values_update" ON public.custom_field_values FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "custom_field_values_delete" ON public.custom_field_values;
CREATE POLICY "custom_field_values_delete" ON public.custom_field_values FOR DELETE TO authenticated
USING (public.is_staff());


-- 3. Consolidate multiple permissive policies on the same role/action to optimize performance (0006)

-- public.announcements
DROP POLICY IF EXISTS "staff_manage_announcements" ON public.announcements;
DROP POLICY IF EXISTS "anyone_view_announcements" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE TO authenticated
USING (public.is_staff());

-- public.maintenance_requests
DROP POLICY IF EXISTS "maintenance_requests_staff" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_resident_all" ON public.maintenance_requests;

CREATE POLICY "maintenance_requests_select" ON public.maintenance_requests FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

CREATE POLICY "maintenance_requests_insert" ON public.maintenance_requests FOR INSERT TO authenticated
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

CREATE POLICY "maintenance_requests_update" ON public.maintenance_requests FOR UPDATE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id))
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

CREATE POLICY "maintenance_requests_delete" ON public.maintenance_requests FOR DELETE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

-- public.violation_categories
DROP POLICY IF EXISTS "violation_categories_staff" ON public.violation_categories;
DROP POLICY IF EXISTS "violation_categories_resident_select" ON public.violation_categories;

CREATE POLICY "violation_categories_select" ON public.violation_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "violation_categories_insert" ON public.violation_categories FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "violation_categories_update" ON public.violation_categories FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "violation_categories_delete" ON public.violation_categories FOR DELETE TO authenticated
USING (public.is_staff());

-- public.violations
DROP POLICY IF EXISTS "violations_staff" ON public.violations;
DROP POLICY IF EXISTS "violations_resident_select" ON public.violations;
DROP POLICY IF EXISTS "violations_resident_update" ON public.violations;

CREATE POLICY "violations_select" ON public.violations FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

CREATE POLICY "violations_insert" ON public.violations FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "violations_update" ON public.violations FOR UPDATE TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id))
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

CREATE POLICY "violations_delete" ON public.violations FOR DELETE TO authenticated
USING (public.is_staff());

-- public.violation_logs
DROP POLICY IF EXISTS "violation_logs_staff" ON public.violation_logs;
DROP POLICY IF EXISTS "violation_logs_resident_select" ON public.violation_logs;

CREATE POLICY "violation_logs_select" ON public.violation_logs FOR SELECT TO authenticated
USING (
    public.is_staff() OR 
    EXISTS (
        SELECT 1 FROM public.violations v
        WHERE v.id = violation_id AND public.is_property_owner(v.property_id)
    )
);

CREATE POLICY "violation_logs_insert" ON public.violation_logs FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "violation_logs_update" ON public.violation_logs FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "violation_logs_delete" ON public.violation_logs FOR DELETE TO authenticated
USING (public.is_staff());


-- 4. Secure public bucket listing (0025)
DROP POLICY IF EXISTS "Public Document Access" ON storage.objects;
CREATE POLICY "Authenticated Document Access" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');


-- 5. Revoke public select from anon for GraphQL and PostgREST endpoint discovery (0026)
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE SELECT ON ALL SEQUENCES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON SEQUENCES FROM anon;


-- 6. Add covering indexes for unindexed foreign keys to optimize query performance (0001)
CREATE INDEX IF NOT EXISTS idx_advance_deposits_property_id ON public.advance_deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_amenity_id ON public.amenity_bookings(amenity_id);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_approved_by ON public.amenity_bookings(approved_by);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_property_id ON public.amenity_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_amenity_schedules_amenity_id ON public.amenity_schedules(amenity_id);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON public.audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_fee_type_id ON public.invoice_items(fee_type_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_period_id ON public.invoices(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_vendor_id ON public.maintenance_requests(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_by ON public.payments(received_by);
CREATE INDEX IF NOT EXISTS idx_penalties_invoice_id ON public.penalties(invoice_id);
CREATE INDEX IF NOT EXISTS idx_property_transfers_from_homeowner_id ON public.property_transfers(from_homeowner_id);
CREATE INDEX IF NOT EXISTS idx_property_transfers_processed_by ON public.property_transfers(processed_by);
CREATE INDEX IF NOT EXISTS idx_property_transfers_property_id ON public.property_transfers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_transfers_to_homeowner_id ON public.property_transfers(to_homeowner_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON public.staff_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_violation_logs_performed_by ON public.violation_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_violation_logs_violation_id ON public.violation_logs(violation_id);
CREATE INDEX IF NOT EXISTS idx_violations_category_id ON public.violations(category_id);
CREATE INDEX IF NOT EXISTS idx_violations_property_id ON public.violations(property_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_invoice_id ON public.water_bills(invoice_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_property_id ON public.water_bills(property_id);
CREATE INDEX IF NOT EXISTS idx_water_bills_reading_id ON public.water_bills(reading_id);
CREATE INDEX IF NOT EXISTS idx_water_meters_property_id ON public.water_meters(property_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_meter_id ON public.water_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_read_by ON public.water_readings(read_by);
