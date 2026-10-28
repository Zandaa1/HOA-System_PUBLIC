-- Add latitude/longitude to amenities for map pins
ALTER TABLE public.amenities
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
  ADD COLUMN IF NOT EXISTS longitude numeric(11, 8);
