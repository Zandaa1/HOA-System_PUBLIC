-- Add photo_url to amenities table
ALTER TABLE public.amenities
ADD COLUMN photo_url text;

-- Update database types reference (manual sync note: update lib/types/database.ts)
