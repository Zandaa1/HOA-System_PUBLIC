-- Migration file: supabase/migrations/20260523000000_perf_and_privacy.sql

-- 1. Restrict SELECT RLS policies on homeowners and renters tables
-- Currently, homeowners_select allows any authenticated user to view all homeowners.
-- We restrict it to staff or household members (is_property_owner).
DROP POLICY IF EXISTS "homeowners_select" ON public.homeowners;
CREATE POLICY "homeowners_select" ON public.homeowners FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

DROP POLICY IF EXISTS "renters_select" ON public.renters;
CREATE POLICY "renters_select" ON public.renters FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_property_owner(property_id));

CREATE OR REPLACE VIEW public.community_directory AS
SELECT 
    h.id,
    h.first_name,
    h.last_name,
    h.property_id,
    CASE 
        WHEN public.is_staff() OR public.is_property_owner(h.property_id) THEN h.hide_email
        ELSE true
    END AS hide_email,
    CASE 
        WHEN public.is_staff() OR public.is_property_owner(h.property_id) THEN h.hide_phone
        ELSE true
    END AS hide_phone,
    CASE 
        WHEN public.is_staff() OR public.is_property_owner(h.property_id) THEN h.email
        ELSE NULL
    END AS email,
    CASE 
        WHEN public.is_staff() OR public.is_property_owner(h.property_id) THEN h.phone
        ELSE NULL
    END AS phone
FROM 
    public.homeowners h;

-- Grant select privileges to authenticated residents
GRANT SELECT ON public.community_directory TO authenticated;

-- 3. Add covering B-Tree indexes for commonly queried/searched columns
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON public.invoices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_booking_date_status ON public.amenity_bookings (booking_date, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON public.vehicles (plate_number);
