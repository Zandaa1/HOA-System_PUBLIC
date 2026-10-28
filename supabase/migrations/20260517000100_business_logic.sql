-- HOA System Business Logic & State Transitions

-- 1. Amenity Booking Overlap Validation
-- This function checks for overlapping bookings for the same amenity and date.
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.amenity_bookings
        WHERE amenity_id = NEW.amenity_id
        AND booking_date = NEW.booking_date
        AND status IN ('pending', 'confirmed', 'approved')
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (NEW.start_time < end_time AND NEW.end_time > start_time)
    ) THEN
        RAISE EXCEPTION 'Amenity is already booked for the selected date and time range.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_booking_overlap ON public.amenity_bookings;
CREATE TRIGGER tr_check_booking_overlap
BEFORE INSERT OR UPDATE ON public.amenity_bookings
FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();

-- 2. Automated Property Status Transitions
-- This function updates property status based on homeowner/renter occupancy.
CREATE OR REPLACE FUNCTION public.update_property_occupancy_status()
RETURNS TRIGGER AS $$
DECLARE
    v_property_id UUID;
    v_has_residents BOOLEAN;
BEGIN
    v_property_id := COALESCE(NEW.property_id, OLD.property_id);
    
    IF v_property_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check if property has any homeowners or active renters
    SELECT EXISTS (
        SELECT 1 FROM public.homeowners WHERE property_id = v_property_id
        UNION
        SELECT 1 FROM public.renters WHERE property_id = v_property_id AND is_active = true
    ) INTO v_has_residents;

    -- Update property status
    -- Only update if it's currently occupied or vacant (don't override for_sale/for_rent manual states if we decide so, 
    -- but usually occupied takes precedence)
    IF v_has_residents THEN
        UPDATE public.properties 
        SET status = 'occupied', updated_at = NOW() 
        WHERE id = v_property_id AND status <> 'occupied';
    ELSE
        UPDATE public.properties 
        SET status = 'vacant', updated_at = NOW() 
        WHERE id = v_property_id AND status <> 'vacant';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for homeowners
DROP TRIGGER IF EXISTS tr_update_property_status_homeowner ON public.homeowners;
CREATE TRIGGER tr_update_property_status_homeowner
AFTER INSERT OR UPDATE OR DELETE ON public.homeowners
FOR EACH ROW EXECUTE FUNCTION public.update_property_occupancy_status();

-- Trigger for renters
DROP TRIGGER IF EXISTS tr_update_property_status_renter ON public.renters;
CREATE TRIGGER tr_update_property_status_renter
AFTER INSERT OR UPDATE OR DELETE ON public.renters
FOR EACH ROW EXECUTE FUNCTION public.update_property_occupancy_status();

-- 3. Sync Renter Status to Property
-- Ensure when a renter is marked inactive, it checks occupancy again.
-- (Handled by the trigger above as it checks is_active = true)

-- 4. Initial Sync (Optional but good for existing data)
-- UPDATE public.properties p
-- SET status = CASE 
--     WHEN EXISTS (SELECT 1 FROM public.homeowners h WHERE h.property_id = p.id) OR 
--          EXISTS (SELECT 1 FROM public.renters r WHERE r.property_id = p.id AND r.is_active = true) 
--     THEN 'occupied'::text 
--     ELSE 'vacant'::text 
-- END
-- WHERE status IN ('occupied', 'vacant');
