INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('default_map_lat', '0.001', 'number', 'Default map center latitude for HOA System'),

  ('default_map_lng', '0.001', 'number', 'Default map center longitude for HOA System'),

  ('default_map_zoom', '16', 'number', 'Default map zoom level')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value;
