-- Function to handle audit logging via triggers
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_id UUID;
    v_action TEXT;
    v_old_values JSONB := NULL;
    v_new_values JSONB := NULL;
BEGIN
    -- Determine the action
    v_action := TG_OP;
    
    -- Capture values
    IF (TG_OP = 'UPDATE') THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_values := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_values := to_jsonb(OLD);
    END IF;

    -- Try to get the staff_id for the current user
    SELECT id INTO v_staff_id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;

    -- Insert into audit_logs
    INSERT INTO public.audit_logs (
        user_id,
        staff_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        v_staff_id,
        v_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_values,
        v_new_values
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to key tables
DROP TRIGGER IF EXISTS audit_properties ON public.properties;
CREATE TRIGGER audit_properties
AFTER INSERT OR UPDATE OR DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_staff ON public.staff;
CREATE TRIGGER audit_staff
AFTER INSERT OR UPDATE OR DELETE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_homeowners ON public.homeowners;
CREATE TRIGGER audit_homeowners
AFTER INSERT OR UPDATE OR DELETE ON public.homeowners
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
