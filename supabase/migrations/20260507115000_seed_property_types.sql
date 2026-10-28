-- Ensure property_types has a unique constraint on name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_types_name_key') THEN
        ALTER TABLE public.property_types ADD CONSTRAINT property_types_name_key UNIQUE (name);
    END IF;
END $$;

-- Seed default property types
INSERT INTO public.property_types (name, color, description)
VALUES 
  ('Residential - Single', '#22c55e', 'Single detached residential property'),
  ('Residential - Townhouse', '#10b981', 'Townhouse or row house unit'),
  ('Commercial', '#3b82f6', 'Commercial or business property'),
  ('Open Lot', '#f59e0b', 'Vacant residential lot'),
  ('Amenity Area', '#8b5cf6', 'Community amenity or facility'),
  ('Parking Area', '#64748b', 'Designated parking space')
ON CONFLICT (name) DO NOTHING;
