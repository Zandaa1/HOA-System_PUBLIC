-- Module toggle flags (default enabled for all)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('enable_amenities', 'true', 'boolean', 'Amenity facilities, bookings, and calendar'),
  ('enable_violations', 'true', 'boolean', 'Violation tracking and notices'),
  ('enable_maintenance', 'true', 'boolean', 'Maintenance request management'),
  ('enable_gate', 'true', 'boolean', 'Gate entry log'),
  ('enable_documents', 'true', 'boolean', 'Document management and storage'),
  ('enable_reports', 'true', 'boolean', 'Financial and occupancy reports'),
  ('enable_bank_accounts', 'true', 'boolean', 'Bank account tracking'),
  ('enable_cash_advances', 'true', 'boolean', 'Cash advance and petty cash fund management'),
  ('enable_disbursements', 'true', 'boolean', 'Expense disbursements'),
  ('enable_finance', 'true', 'boolean', 'Finance overview dashboard')
ON CONFLICT (setting_key) DO NOTHING;

-- Branding settings (defaults for HOA System)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('hoa_name', 'HOA System', 'string', 'Short HOA name shown in headers and navigation'),
  ('hoa_full_name', 'HOA System', 'string', 'Full subdivision name used in documents'),
  ('hoa_address', 'Demo community address', 'string', 'HOA office address'),
  ('hoa_logo_url', '/placeholder-logo.svg', 'string', 'Logo image path or URL'),
  ('hoa_favicon_url', '/icon.svg', 'string', 'Favicon path or URL'),
  ('hoa_website', 'https://example.invalid', 'string', 'Official HOA website URL'),
  ('hoa_helpdesk_email', 'helpdesk@example.invalid', 'string', 'Helpdesk email address')
ON CONFLICT (setting_key) DO NOTHING;
