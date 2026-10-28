-- Additional Audit Triggers for missing entities

DROP TRIGGER IF EXISTS audit_renters ON public.renters;
CREATE TRIGGER audit_renters
AFTER INSERT OR UPDATE OR DELETE ON public.renters
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_water_meters ON public.water_meters;
CREATE TRIGGER audit_water_meters
AFTER INSERT OR UPDATE OR DELETE ON public.water_meters
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_water_readings ON public.water_readings;
CREATE TRIGGER audit_water_readings
AFTER INSERT OR UPDATE OR DELETE ON public.water_readings
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_amenity_bookings ON public.amenity_bookings;
CREATE TRIGGER audit_amenity_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.amenity_bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
