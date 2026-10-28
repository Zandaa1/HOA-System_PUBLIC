-- Link homeowners and renters to Supabase Auth users

ALTER TABLE "public"."homeowners" 
ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."renters" 
ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_homeowners_user_id ON public.homeowners(user_id);
CREATE INDEX IF NOT EXISTS idx_renters_user_id ON public.renters(user_id);
