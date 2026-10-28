-- Migration: Developer Portal Extensions

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('client_master_account_id', '', 'string', 'User ID of the client master administrator account')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description;
