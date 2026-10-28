-- Local simplification: direct per-staff page-group access.
-- This keeps legacy roles/staff_roles data in place, but the app now reads
-- public.staff.permissions as the source of truth.

ALTER TABLE public.staff
  ALTER COLUMN permissions SET DEFAULT '{}'::jsonb;

WITH effective AS (
  SELECT
    s.id,
    COALESCE(bool_or(
      COALESCE((r.permissions->>'all')::boolean, false)
      OR r.name IN ('Developer', 'Administrator')
    ), false) AS all_access,
    COALESCE(bool_or(r.name = 'Accountant'
      OR COALESCE((r.permissions->>'enable_finance')::boolean, false)
      OR COALESCE((r.permissions->>'enable_reports')::boolean, false)
      OR COALESCE((r.permissions->>'enable_bank_accounts')::boolean, false)
      OR COALESCE((r.permissions->>'enable_cash_advances')::boolean, false)
      OR COALESCE((r.permissions->>'enable_disbursements')::boolean, false)
    ), false) AS finance,
    COALESCE(bool_or(r.name = 'Property Manager'), false) AS properties,
    COALESCE(bool_or(r.name = 'Property Manager'), false) AS residents,
    COALESCE(bool_or(r.name IN ('Property Manager', 'Security')
      OR COALESCE((r.permissions->>'enable_gate')::boolean, false)
    ), false) AS vehicles,
    COALESCE(bool_or(r.name = 'Property Manager'
      OR COALESCE((r.permissions->>'enable_amenities')::boolean, false)
    ), false) AS amenities,
    COALESCE(bool_or(COALESCE((r.permissions->>'enable_water_billing')::boolean, false)), false) AS water,
    COALESCE(bool_or(COALESCE((r.permissions->>'enable_documents')::boolean, false)), false) AS documents,
    COALESCE(bool_or(COALESCE((r.permissions->>'enable_violations')::boolean, false)), false) AS violations,
    COALESCE(bool_or(COALESCE((r.permissions->>'enable_maintenance')::boolean, false)), false) AS maintenance,
    COALESCE(bool_or(r.name = 'Security'
      OR COALESCE((r.permissions->>'enable_gate')::boolean, false)
    ), false) AS gate
  FROM public.staff s
  LEFT JOIN public.staff_roles sr ON sr.staff_id = s.id
  LEFT JOIN public.roles r ON r.id = sr.role_id
  GROUP BY s.id
)
UPDATE public.staff s
SET permissions =
  CASE
    WHEN e.all_access THEN '{"all": true}'::jsonb
    ELSE jsonb_strip_nulls(jsonb_build_object(
      'overview', true,
      'finance', CASE WHEN e.finance THEN true ELSE NULL END,
      'properties', CASE WHEN e.properties THEN true ELSE NULL END,
      'residents', CASE WHEN e.residents THEN true ELSE NULL END,
      'vehicles', CASE WHEN e.vehicles THEN true ELSE NULL END,
      'amenities', CASE WHEN e.amenities THEN true ELSE NULL END,
      'water', CASE WHEN e.water THEN true ELSE NULL END,
      'documents', CASE WHEN e.documents THEN true ELSE NULL END,
      'violations', CASE WHEN e.violations THEN true ELSE NULL END,
      'maintenance', CASE WHEN e.maintenance THEN true ELSE NULL END,
      'gate', CASE WHEN e.gate THEN true ELSE NULL END
    ))
  END
FROM effective e
WHERE s.id = e.id;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND s.is_active = true
      AND (
        COALESCE((s.permissions->>'all')::boolean, false)
        OR COALESCE((s.permissions->>'staff_access')::boolean, false)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
