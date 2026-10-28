-- Migration: Add bank_account_id to payments
-- Attributes collections to a specific bank account.

ALTER TABLE public.payments
  ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id);
