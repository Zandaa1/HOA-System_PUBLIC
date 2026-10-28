-- Migration: supabase/migrations/20260522170000_accounting_permissions_and_auditing.sql

-- 1. Add columns to existing tables
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_rented boolean DEFAULT false NOT NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"all": true}'::jsonb NOT NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_alert boolean DEFAULT false NOT NULL;

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Create disbursements table
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_number TEXT, -- check or voucher number
    category TEXT NOT NULL, -- Utility, Transportation, Salary, Representation, Repairs, Bond Refund, Supplies, Legal, Security, Transfer, Other
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Cash', -- Cash, Check, Bank Transfer
    account TEXT NOT NULL DEFAULT 'Cash on Hand', -- BPI, CBC, Cash on Hand
    payee TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on disbursements
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

-- 4. Create non_invoice_collections table
CREATE TABLE IF NOT EXISTS public.non_invoice_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT,
    category TEXT NOT NULL, -- Bank Interest, Transfer, Other
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer', -- Bank Transfer, etc
    account TEXT NOT NULL DEFAULT 'BPI', -- BPI, CBC, Cash on Hand
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on non_invoice_collections
ALTER TABLE public.non_invoice_collections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Documents RLS Policies
DROP POLICY IF EXISTS documents_staff ON public.documents;
CREATE POLICY documents_staff ON public.documents
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
    FOR SELECT TO authenticated
    USING (true);

-- Disbursements RLS Policies
DROP POLICY IF EXISTS disbursements_staff ON public.disbursements;
CREATE POLICY disbursements_staff ON public.disbursements
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Non-Invoice Collections RLS Policies
DROP POLICY IF EXISTS non_invoice_collections_staff ON public.non_invoice_collections;
CREATE POLICY non_invoice_collections_staff ON public.non_invoice_collections
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 6. Security Definer helper for property owners to toggle is_rented
CREATE OR REPLACE FUNCTION public.update_property_rented(prop_id UUID, rented BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.is_property_owner(prop_id) THEN
        UPDATE public.properties
        SET is_rented = rented
        WHERE id = prop_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: You do not own this property.';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_property_rented(UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_property_rented(UUID, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_property_rented(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_property_rented(UUID, BOOLEAN) TO service_role;

-- 7. Register Audit Triggers
DROP TRIGGER IF EXISTS audit_advance_deposits ON public.advance_deposits;
CREATE TRIGGER audit_advance_deposits
AFTER INSERT OR UPDATE OR DELETE ON public.advance_deposits
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_discounts ON public.discounts;
CREATE TRIGGER audit_discounts
AFTER INSERT OR UPDATE OR DELETE ON public.discounts
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_fee_types ON public.fee_types;
CREATE TRIGGER audit_fee_types
AFTER INSERT OR UPDATE OR DELETE ON public.fee_types
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_billing_periods ON public.billing_periods;
CREATE TRIGGER audit_billing_periods
AFTER INSERT OR UPDATE OR DELETE ON public.billing_periods
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_system_settings ON public.system_settings;
CREATE TRIGGER audit_system_settings
AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_amenities ON public.amenities;
CREATE TRIGGER audit_amenities
AFTER INSERT OR UPDATE OR DELETE ON public.amenities
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_violations ON public.violations;
CREATE TRIGGER audit_violations
AFTER INSERT OR UPDATE OR DELETE ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_violation_categories ON public.violation_categories;
CREATE TRIGGER audit_violation_categories
AFTER INSERT OR UPDATE OR DELETE ON public.violation_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_maintenance_requests ON public.maintenance_requests;
CREATE TRIGGER audit_maintenance_requests
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_documents ON public.documents;
CREATE TRIGGER audit_documents
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_disbursements ON public.disbursements;
CREATE TRIGGER audit_disbursements
AFTER INSERT OR UPDATE OR DELETE ON public.disbursements
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_non_invoice_collections ON public.non_invoice_collections;
CREATE TRIGGER audit_non_invoice_collections
AFTER INSERT OR UPDATE OR DELETE ON public.non_invoice_collections
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
