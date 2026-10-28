-- Migration file: supabase/migrations/20260520000000_violation_and_maintenance.sql

-- 1. Violation Categories
CREATE TABLE IF NOT EXISTS public.violation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Violations
CREATE TABLE IF NOT EXISTS public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.violation_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'warning_issued', -- 'warning_issued', 'fine_issued', 'resolved', 'appealed', 'cancelled'
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    fine_applied NUMERIC(10, 2) NOT NULL DEFAULT 0,
    portal_alert_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Violation Logs / Audit Trail
CREATE TABLE IF NOT EXISTS public.violation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Maintenance Vendors
CREATE TABLE IF NOT EXISTS public.maintenance_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Maintenance Requests
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'plumbing', 'electrical', 'carpentry', 'landscaping', 'other'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'emergency'
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    assigned_vendor_id UUID REFERENCES public.maintenance_vendors(id) ON DELETE SET NULL,
    estimated_cost NUMERIC(10, 2),
    actual_cost NUMERIC(10, 2),
    scheduled_date DATE,
    completion_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.violation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies:

-- staff can do anything to all of these
CREATE POLICY violation_categories_staff ON public.violation_categories FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY violations_staff ON public.violations FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY violation_logs_staff ON public.violation_logs FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY maintenance_vendors_staff ON public.maintenance_vendors FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY maintenance_requests_staff ON public.maintenance_requests FOR ALL TO authenticated USING (public.is_staff());

-- residents can read violation categories
CREATE POLICY violation_categories_resident_select ON public.violation_categories FOR SELECT TO authenticated USING (true);

-- residents can read violations for their own properties
CREATE POLICY violations_resident_select ON public.violations FOR SELECT TO authenticated USING (public.is_property_owner(property_id));

-- residents can update portal_alert_dismissed on their own property's violations
CREATE POLICY violations_resident_update ON public.violations FOR UPDATE TO authenticated USING (public.is_property_owner(property_id));

-- residents can read violation logs for their own property's violations
CREATE POLICY violation_logs_resident_select ON public.violation_logs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.violations v
        WHERE v.id = violation_id AND public.is_property_owner(v.property_id)
    )
);

-- residents can read, insert, and update maintenance requests for their own properties
CREATE POLICY maintenance_requests_resident_all ON public.maintenance_requests FOR ALL TO authenticated
USING (public.is_property_owner(property_id))
WITH CHECK (public.is_property_owner(property_id));

-- Add triggers for automatic audit logging
CREATE TRIGGER audit_violations
AFTER INSERT OR UPDATE OR DELETE ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_maintenance_vendors
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_vendors
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_maintenance_requests
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
