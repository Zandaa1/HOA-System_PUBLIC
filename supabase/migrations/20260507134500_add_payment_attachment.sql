-- Add attachment_url to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS attachment_url text;
