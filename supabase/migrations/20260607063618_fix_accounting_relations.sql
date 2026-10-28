-- Fix accounting account attribution.
-- Local-first migration: creates FK-based bank account references for collections
-- and separates inter-account transfers from income.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bank_accounts
    GROUP BY lower(trim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate bank account names exist after normalization. Resolve duplicates before applying fix_accounting_relations.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_name_normalized
  ON public.bank_accounts (lower(trim(name)));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bank_accounts'::regclass
      AND conname = 'bank_accounts_name_key'
  ) THEN
    ALTER TABLE public.bank_accounts
      ADD CONSTRAINT bank_accounts_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO public.bank_accounts (name, account_number, bank_name, type, is_active)
SELECT 'Unassigned Legacy Deposit', NULL, NULL, 'current', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.bank_accounts WHERE lower(trim(name)) = lower(trim('Unassigned Legacy Deposit'))
);

ALTER TABLE public.non_invoice_collections
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id);

UPDATE public.non_invoice_collections nic
SET bank_account_id = ba.id
FROM public.bank_accounts ba
WHERE nic.bank_account_id IS NULL
  AND lower(trim(nic.account)) = lower(trim(ba.name));

UPDATE public.non_invoice_collections nic
SET bank_account_id = ba.id
FROM public.bank_accounts ba
WHERE nic.bank_account_id IS NULL
  AND ba.name = 'Unassigned Legacy Deposit';

ALTER TABLE public.non_invoice_collections
  ALTER COLUMN bank_account_id SET NOT NULL;

DROP VIEW IF EXISTS public.cash_flow_rollup;
DROP VIEW IF EXISTS public.combined_collections_list;

ALTER TABLE public.non_invoice_collections
  DROP COLUMN IF EXISTS account;

UPDATE public.payments p
SET bank_account_id = ba.id
FROM public.bank_accounts ba
WHERE p.bank_account_id IS NULL
  AND lower(COALESCE(p.payment_method, '')) = 'cash'
  AND ba.name = 'Cash on Hand';

UPDATE public.payments p
SET bank_account_id = ba.id
FROM public.bank_accounts ba
WHERE p.bank_account_id IS NULL
  AND ba.name = 'Unassigned Legacy Deposit';

ALTER TABLE public.payments
  ALTER COLUMN bank_account_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT,
  source_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  destination_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_transfers_distinct_accounts
    CHECK (source_bank_account_id <> destination_bank_account_id)
);

ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_transfers_staff ON public.account_transfers;
CREATE POLICY account_transfers_staff
  ON public.account_transfers FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_transfers TO authenticated;

CREATE INDEX IF NOT EXISTS idx_account_transfers_source
  ON public.account_transfers (source_bank_account_id);

CREATE INDEX IF NOT EXISTS idx_account_transfers_destination
  ON public.account_transfers (destination_bank_account_id);

CREATE INDEX IF NOT EXISTS idx_account_transfers_date
  ON public.account_transfers (transfer_date);

DROP TRIGGER IF EXISTS account_transfers_updated_at ON public.account_transfers;
CREATE TRIGGER account_transfers_updated_at
  BEFORE UPDATE ON public.account_transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS audit_account_transfers ON public.account_transfers;
CREATE TRIGGER audit_account_transfers
  AFTER INSERT OR UPDATE OR DELETE ON public.account_transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE OR REPLACE VIEW public.cash_flow_rollup
WITH (security_invoker = true)
AS
WITH monthly_payments AS (
  SELECT
    p.bank_account_id,
    EXTRACT(MONTH FROM p.payment_date)::INTEGER AS period_month,
    EXTRACT(YEAR FROM p.payment_date)::INTEGER AS period_year,
    SUM(p.amount) AS total_collected,
    0::NUMERIC AS total_disbursed
  FROM public.payments p
  GROUP BY p.bank_account_id, EXTRACT(MONTH FROM p.payment_date), EXTRACT(YEAR FROM p.payment_date)
),
monthly_non_invoice AS (
  SELECT
    nic.bank_account_id,
    EXTRACT(MONTH FROM nic.payment_date)::INTEGER AS period_month,
    EXTRACT(YEAR FROM nic.payment_date)::INTEGER AS period_year,
    SUM(nic.amount) AS total_collected,
    0::NUMERIC AS total_disbursed
  FROM public.non_invoice_collections nic
  GROUP BY nic.bank_account_id, EXTRACT(MONTH FROM nic.payment_date), EXTRACT(YEAR FROM nic.payment_date)
),
monthly_disbursements AS (
  SELECT
    d.bank_account_id,
    d.period_month,
    d.period_year,
    0::NUMERIC AS total_collected,
    SUM(d.amount) AS total_disbursed
  FROM public.disbursements d
  WHERE d.is_advance_release = false
    AND d.is_fund_transfer = false
  GROUP BY d.bank_account_id, d.period_month, d.period_year
)
SELECT
  bank_account_id,
  period_month,
  period_year,
  SUM(total_collected) AS total_collected,
  SUM(total_disbursed) AS total_disbursed
FROM (
  SELECT * FROM monthly_payments
  UNION ALL SELECT * FROM monthly_non_invoice
  UNION ALL SELECT * FROM monthly_disbursements
) activity
GROUP BY bank_account_id, period_month, period_year;

CREATE OR REPLACE VIEW public.combined_collections_list WITH (security_invoker = true) AS
SELECT
    p.id AS source_id,
    'payment'::text AS source_type,
    p.payment_number AS reference_number,
    p.amount,
    p.payment_date::text AS payment_date,
    p.payment_method,
    ba.name AS external_ref,
    p.created_at,
    inv.invoice_number AS parent_ref,
    prop.block AS block,
    prop.lot AS lot
FROM public.payments p
JOIN public.invoices inv ON inv.id = p.invoice_id
JOIN public.properties prop ON prop.id = inv.property_id
LEFT JOIN public.bank_accounts ba ON ba.id = p.bank_account_id

UNION ALL

SELECT
    nic.id AS source_id,
    'non_invoice'::text AS source_type,
    nic.receipt_number AS reference_number,
    nic.amount,
    nic.payment_date::text AS payment_date,
    nic.payment_method,
    ba.name AS external_ref,
    nic.created_at,
    nic.category AS parent_ref,
    NULL::text AS block,
    NULL::text AS lot
FROM public.non_invoice_collections nic
LEFT JOIN public.bank_accounts ba ON ba.id = nic.bank_account_id;

GRANT SELECT ON public.combined_collections_list TO authenticated;
