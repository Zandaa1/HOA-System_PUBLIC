-- Custom Authentication RPC for Resident Portal
-- Uses Block, Lot, and Last Name to authenticate a resident (homeowner or renter)

CREATE OR REPLACE FUNCTION public.authenticate_resident(
    p_block TEXT,
    p_lot TEXT,
    p_last_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property_id UUID;
    v_resident_id UUID;
    v_resident_type TEXT;
    v_first_name TEXT;
    v_result JSONB;
BEGIN
    -- 1. Find the property
    SELECT id INTO v_property_id
    FROM public.properties
    WHERE block = p_block AND lot = p_lot
    LIMIT 1;

    IF v_property_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Property not found');
    END IF;

    -- 2. Check Homeowners first
    SELECT id, first_name INTO v_resident_id, v_first_name
    FROM public.homeowners
    WHERE property_id = v_property_id AND lower(last_name) = lower(p_last_name)
    LIMIT 1;

    IF v_resident_id IS NOT NULL THEN
        v_resident_type := 'homeowner';
    ELSE
        -- 3. Check Renters if not a homeowner
        SELECT id, first_name INTO v_resident_id, v_first_name
        FROM public.renters
        WHERE property_id = v_property_id AND lower(last_name) = lower(p_last_name) AND is_active = true
        LIMIT 1;

        IF v_resident_id IS NOT NULL THEN
            v_resident_type := 'renter';
        END IF;
    END IF;

    -- 4. Return result
    IF v_resident_id IS NOT NULL THEN
        v_result := jsonb_build_object(
            'success', true,
            'resident_id', v_resident_id,
            'property_id', v_property_id,
            'resident_type', v_resident_type,
            'first_name', v_first_name,
            'last_name', p_last_name,
            'block', p_block,
            'lot', p_lot
        );
    ELSE
        v_result := jsonb_build_object('error', 'Resident not found or name mismatch');
    END IF;

    RETURN v_result;
END;
$$;
