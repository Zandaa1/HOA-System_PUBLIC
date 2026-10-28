-- Add indexes for commonly queried foreign keys
CREATE INDEX IF NOT EXISTS idx_homeowners_property_id ON public.homeowners(property_id);
CREATE INDEX IF NOT EXISTS idx_renters_property_id ON public.renters(property_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_property_id ON public.vehicles(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_type_id ON public.properties(property_type_id);
