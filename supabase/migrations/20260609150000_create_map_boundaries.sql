CREATE TABLE public.map_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'default',
  geometry jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read boundaries"
  ON public.map_boundaries
  FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Developer can manage boundaries"
  ON public.map_boundaries
  FOR ALL
  USING (
    (SELECT id FROM public.staff WHERE user_id = auth.uid())
    = (SELECT setting_value::uuid FROM public.system_settings WHERE setting_key = 'developer_staff_id')
  );

CREATE UNIQUE INDEX idx_map_boundaries_name ON public.map_boundaries (name);
