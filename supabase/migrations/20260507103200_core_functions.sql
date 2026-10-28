-- Core Functions for RLS

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_property_owner(prop_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.homeowners
    WHERE property_id = prop_id AND id IN (
      SELECT id FROM public.homeowners WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  ) OR EXISTS (
    SELECT 1 FROM public.renters
    WHERE property_id = prop_id AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
