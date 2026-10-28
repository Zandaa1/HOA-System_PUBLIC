-- Migration: bank_accounts table
-- Creates the bank_accounts registry for attributing collections and disbursements per bank.

CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('current', 'savings', 'money_market', 'petty_cash')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read bank_accounts"
  ON public.bank_accounts FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can insert bank_accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update bank_accounts"
  ON public.bank_accounts FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can delete bank_accounts"
  ON public.bank_accounts FOR DELETE
  USING (public.is_staff());

-- Seed default bank account rows (Cash on Hand only, BPI/CBC moved to test seeding)
INSERT INTO public.bank_accounts (name, account_number, bank_name, type) VALUES
  ('Cash on Hand', NULL, NULL, 'petty_cash');
