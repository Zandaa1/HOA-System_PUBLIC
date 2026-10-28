-- Add privacy settings to homeowners
ALTER TABLE "public"."homeowners" 
ADD COLUMN IF NOT EXISTS "hide_phone" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hide_email" boolean DEFAULT false;

-- Add privacy settings to renters
ALTER TABLE "public"."renters" 
ADD COLUMN IF NOT EXISTS "hide_phone" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hide_email" boolean DEFAULT false;
