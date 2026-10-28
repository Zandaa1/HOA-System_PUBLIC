-- Migration: Update RLS policies on renters table to allow property owners (homeowners) to insert, update, and delete renters.

-- 1. Insert policy
DROP POLICY IF EXISTS "renters_insert" ON public.renters;
CREATE POLICY "renters_insert" ON public.renters FOR INSERT TO authenticated 
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

-- 2. Update policy
DROP POLICY IF EXISTS "renters_update" ON public.renters;
CREATE POLICY "renters_update" ON public.renters FOR UPDATE TO authenticated 
USING (public.is_staff() OR public.is_property_owner(property_id))
WITH CHECK (public.is_staff() OR public.is_property_owner(property_id));

-- 3. Delete policy
DROP POLICY IF EXISTS "renters_delete" ON public.renters;
CREATE POLICY "renters_delete" ON public.renters FOR DELETE TO authenticated 
USING (public.is_staff() OR public.is_property_owner(property_id));
