-- Migration: Setup Page Onboarding Settings Defaults

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('billing_due_offset_days', '15', 'number', 'Days after billing day until dues are marked overdue'),
  ('auto_generate_dues', 'false', 'boolean', 'Whether monthly dues invoices are generated automatically'),
  ('enable_auto_penalties', 'false', 'boolean', 'Whether late payment penalties are applied automatically'),
  ('penalty_grace_period_days', '0', 'number', 'Days after the due date before a penalty is applied'),
  ('late_fee_frequency', 'one_time', 'string', 'Frequency of late fee accrual (one_time or monthly_recurring)'),
  ('water_base_charge', '0', 'number', 'Monthly fixed maintenance fee for properties with water meters'),
  ('water_billing_due_offset_days', '15', 'number', 'Days after meter reading entry until water bill is overdue'),
  ('sticker_fee_amount', '500', 'number', 'Default cost for a car sticker'),
  ('sticker_expiration_warning_days', '30,7', 'string', 'Days before vehicle sticker expiration to trigger warning alerts'),
  ('payment_channels', '[]', 'json', 'Configured electronic payment channels (E-wallets and bank accounts)'),
  ('notify_invoice_issued', 'false', 'boolean', 'Automatically email invoice statements when created'),
  ('notify_payment_receipt', 'false', 'boolean', 'Automatically email receipts when payments are logged/approved'),
  ('notify_sticker_expiration', 'false', 'boolean', 'Automatically email sticker expiration warnings to residents'),
  ('notify_penalty_applied', 'false', 'boolean', 'Automatically email late penalty notices to residents'),
  ('notify_booking_confirmed', 'false', 'boolean', 'Automatically email booking confirmations to residents'),
  ('smtp_host', '', 'string', 'SMTP server host address'),
  ('smtp_port', '587', 'number', 'SMTP server port (e.g. 587 or 465)'),
  ('smtp_username', '', 'string', 'SMTP server username'),
  ('smtp_password', '', 'string', 'SMTP server password'),
  ('smtp_sender_name', '', 'string', 'SMTP sender display name'),
  ('smtp_sender_email', '', 'string', 'SMTP sender email address')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description;
