-- Migration: Seed Core System Roles
-- This ensures the core roles are available both in local development and production.

INSERT INTO public.roles (id, name, description, permissions, is_system_role)
VALUES 
  (gen_random_uuid(), 'Administrator', 'Full system access', '{"all": true}', false),
  (gen_random_uuid(), 'Accountant', 'Billing, finance, and reports', '{"enable_reports": true, "enable_bank_accounts": true, "enable_cash_advances": true, "enable_disbursements": true, "enable_finance": true}', false),
  (gen_random_uuid(), 'Security', 'Gate entry and vehicle logs', '{"enable_gate": true}', false),
  (gen_random_uuid(), 'Property Manager', 'Properties, residents, and vehicles', '{}', false)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;
