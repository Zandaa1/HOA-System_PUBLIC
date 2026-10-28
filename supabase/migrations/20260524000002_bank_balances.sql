-- Migration: bank_balances table
-- Tracks monthly beginning and ending balances per bank account.

CREATE TABLE public.bank_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  beginning_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (bank_account_id, period_month, period_year)
);

ALTER TABLE public.bank_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read bank_balances"
  ON public.bank_balances FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can insert bank_balances"
  ON public.bank_balances FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update bank_balances"
  ON public.bank_balances FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can delete bank_balances"
  ON public.bank_balances FOR DELETE
  USING (public.is_staff());
