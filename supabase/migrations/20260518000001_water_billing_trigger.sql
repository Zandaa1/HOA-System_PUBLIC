-- Water Reading to Billing Integration

-- Function to calculate water bill amount based on active rates
CREATE OR REPLACE FUNCTION public.calculate_water_bill()
RETURNS TRIGGER AS $$
DECLARE
    v_property_id UUID;
    v_amount NUMERIC(10,2) := 0;
    v_rate RECORD;
    v_billing_period TEXT;
    v_remaining_consumption NUMERIC(12,2);
    v_tier_consumption NUMERIC(12,2);
BEGIN
    -- Only generate a bill if consumption is > 0
    IF NEW.consumption <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get property ID from the meter
    SELECT property_id INTO v_property_id FROM public.water_meters WHERE id = NEW.meter_id;
    
    IF v_property_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Format billing period (e.g., "May 2026")
    v_billing_period := to_char(NEW.reading_date, 'FMMonth YYYY');
    
    -- Calculate bill amount using tiered rates
    v_remaining_consumption := NEW.consumption;
    
    FOR v_rate IN 
        SELECT min_consumption, max_consumption, rate_per_cubic_meter 
        FROM public.water_rates 
        WHERE is_active = true 
          AND effective_from <= NEW.reading_date 
          AND (effective_until IS NULL OR effective_until >= NEW.reading_date)
        ORDER BY min_consumption ASC
    LOOP
        IF v_remaining_consumption > 0 AND v_remaining_consumption > v_rate.min_consumption THEN
            -- Calculate how much consumption falls into this tier
            IF v_rate.max_consumption IS NOT NULL THEN
                v_tier_consumption := LEAST(v_remaining_consumption, v_rate.max_consumption - v_rate.min_consumption);
            ELSE
                v_tier_consumption := v_remaining_consumption;
            END IF;
            
            v_amount := v_amount + (v_tier_consumption * v_rate.rate_per_cubic_meter);
            v_remaining_consumption := v_remaining_consumption - v_tier_consumption;
        END IF;
    END LOOP;

    -- Fallback: if no rates matched or calculated, use a default simple calculation (fallback safety)
    IF v_amount = 0 THEN
        v_amount := NEW.consumption * 50.00; -- default 50 PHP per cubic meter
    END IF;

    -- Create the water bill
    INSERT INTO public.water_bills (
        reading_id,
        property_id,
        billing_period,
        consumption,
        amount,
        status
    ) VALUES (
        NEW.id,
        v_property_id,
        v_billing_period,
        NEW.consumption,
        v_amount,
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create water bill on reading insert
DROP TRIGGER IF EXISTS tr_generate_water_bill ON public.water_readings;
CREATE TRIGGER tr_generate_water_bill
AFTER INSERT ON public.water_readings
FOR EACH ROW EXECUTE FUNCTION public.calculate_water_bill();
