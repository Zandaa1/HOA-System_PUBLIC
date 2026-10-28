-- Migration: Cash Advances & PCF Replenishments setup

-- 1. Create helper handle_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Alter disbursements table first so FK references can be created
ALTER TABLE public.disbursements
  ADD COLUMN IF NOT EXISTS cash_advance_id UUID,
  ADD COLUMN IF NOT EXISTS is_advance_release BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fund_transfer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.disbursements.is_advance_release IS
  'True when this disbursement is a cash advance release. Excluded from expense totals until liquidated.';
COMMENT ON COLUMN public.disbursements.is_fund_transfer IS
  'True for inter-account transfers. Excluded from BIR-reportable disbursements per template convention.';

-- 3. Create cash_advances table
CREATE TABLE IF NOT EXISTS public.cash_advances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number      TEXT UNIQUE NOT NULL,
  advance_type          TEXT NOT NULL DEFAULT 'staff' CHECK (advance_type IN ('staff', 'pcf')),
  grantee_name          TEXT NOT NULL,
  grantee_role          TEXT,
  purpose               TEXT NOT NULL,
  requested_amount      NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
  approved_amount       NUMERIC(12,2),
  released_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  liquidated_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  returned_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  outstanding_balance   NUMERIC(12,2) GENERATED ALWAYS AS (
                          released_amount - liquidated_amount - returned_amount
                        ) STORED,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'pending_approval', 'approved',
                          'released', 'partially_liquidated', 'liquidated', 'cancelled'
                        )),
  source_bank_account_id UUID REFERENCES public.bank_accounts(id),
  release_disbursement_id UUID REFERENCES public.disbursements(id),
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at           TIMESTAMPTZ,
  released_at           TIMESTAMPTZ,
  due_liquidation_date  DATE,
  closed_at             TIMESTAMPTZ,
  approved_by           TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link cash_advance_id FK in disbursements to cash_advances table
ALTER TABLE public.disbursements
  DROP CONSTRAINT IF EXISTS disbursements_cash_advance_id_fkey,
  ADD CONSTRAINT disbursements_cash_advance_id_fkey 
  FOREIGN KEY (cash_advance_id) REFERENCES public.cash_advances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_advances_status ON public.cash_advances (status);
CREATE INDEX IF NOT EXISTS idx_cash_advances_type ON public.cash_advances (advance_type);
CREATE INDEX IF NOT EXISTS idx_cash_advances_bank ON public.cash_advances (source_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_advances_due ON public.cash_advances (due_liquidation_date)
  WHERE status NOT IN ('liquidated', 'cancelled');

-- 4. Create advance_liquidations table
CREATE TABLE IF NOT EXISTS public.advance_liquidations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_advance_id  UUID NOT NULL REFERENCES public.cash_advances(id) ON DELETE RESTRICT,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description      TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN (
                     'utility', 'transportation_equipment', 'salary',
                     'representation', 'repairs', 'refund_bond',
                     'supplies', 'legal', 'security', 'others'
                   )),
  receipt_date     DATE NOT NULL,
  receipt_number   TEXT,
  attachment_url   TEXT,
  disbursement_id  UUID REFERENCES public.disbursements(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liquidations_advance ON public.advance_liquidations (cash_advance_id);
CREATE INDEX IF NOT EXISTS idx_liquidations_category ON public.advance_liquidations (category);

-- 5. Create advance_returns table
CREATE TABLE IF NOT EXISTS public.advance_returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_advance_id  UUID NOT NULL REFERENCES public.cash_advances(id) ON DELETE RESTRICT,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  return_method    TEXT CHECK (return_method IN ('cash', 'bank_transfer', 'gcash')),
  reference_number TEXT,
  returned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_advance ON public.advance_returns (cash_advance_id);

-- 6. Create pcf_replenishments table
CREATE TABLE IF NOT EXISTS public.pcf_replenishments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pcf_bank_account_id  UUID NOT NULL REFERENCES public.bank_accounts(id),
  source_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  requested_amount     NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
  approved_amount      NUMERIC(12,2),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released', 'rejected')),
  disbursement_id      UUID REFERENCES public.disbursements(id) ON DELETE SET NULL,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at          TIMESTAMPTZ,
  released_at          TIMESTAMPTZ,
  approved_by          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Triggers setup
DROP TRIGGER IF EXISTS trg_cash_advances_updated_at ON public.cash_advances;
CREATE TRIGGER trg_cash_advances_updated_at
  BEFORE UPDATE ON public.cash_advances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Register Audit Triggers
DROP TRIGGER IF EXISTS audit_cash_advances ON public.cash_advances;
CREATE TRIGGER audit_cash_advances
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_advances
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_advance_liquidations ON public.advance_liquidations;
CREATE TRIGGER audit_advance_liquidations
  AFTER INSERT OR UPDATE OR DELETE ON public.advance_liquidations
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_advance_returns ON public.advance_returns;
CREATE TRIGGER audit_advance_returns
  AFTER INSERT OR UPDATE OR DELETE ON public.advance_returns
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS audit_pcf_replenishments ON public.pcf_replenishments;
CREATE TRIGGER audit_pcf_replenishments
  AFTER INSERT OR UPDATE OR DELETE ON public.pcf_replenishments
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_replenishments ENABLE ROW LEVEL SECURITY;

-- 9. Setup RLS Policies (Staff: full access, Residents: no access)
DROP POLICY IF EXISTS staff_all_cash_advances ON public.cash_advances;
CREATE POLICY staff_all_cash_advances
  ON public.cash_advances FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_advance_liquidations ON public.advance_liquidations;
CREATE POLICY staff_all_advance_liquidations
  ON public.advance_liquidations FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_advance_returns ON public.advance_returns;
CREATE POLICY staff_all_advance_returns
  ON public.advance_returns FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_pcf_replenishments ON public.pcf_replenishments;
CREATE POLICY staff_all_pcf_replenishments
  ON public.pcf_replenishments FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 10. Update cash_flow_rollup view to exclude advance releases and fund transfers
CREATE OR REPLACE VIEW public.cash_flow_rollup
WITH (security_invoker = true)
AS
WITH monthly_payments AS (
  SELECT
    COALESCE(p.bank_account_id, (SELECT id FROM public.bank_accounts WHERE name = 'Cash on Hand' LIMIT 1)) AS bank_account_id,
    EXTRACT(MONTH FROM p.payment_date)::INTEGER AS period_month,
    EXTRACT(YEAR FROM p.payment_date)::INTEGER AS period_year,
    SUM(p.amount) AS total_collected
  FROM public.payments p
  GROUP BY COALESCE(p.bank_account_id, (SELECT id FROM public.bank_accounts WHERE name = 'Cash on Hand' LIMIT 1)),
           EXTRACT(MONTH FROM p.payment_date),
           EXTRACT(YEAR FROM p.payment_date)
),
monthly_non_invoice AS (
  SELECT
    COALESCE(
      (SELECT id FROM public.bank_accounts WHERE LOWER(TRIM(nic.account)) = LOWER(TRIM(name)) LIMIT 1),
      (SELECT id FROM public.bank_accounts WHERE name = 'Cash on Hand' LIMIT 1)
    ) AS bank_account_id,
    EXTRACT(MONTH FROM nic.payment_date)::INTEGER AS period_month,
    EXTRACT(YEAR FROM nic.payment_date)::INTEGER AS period_year,
    SUM(nic.amount) AS total_collected
  FROM public.non_invoice_collections nic
  GROUP BY COALESCE(
      (SELECT id FROM public.bank_accounts WHERE LOWER(TRIM(nic.account)) = LOWER(TRIM(name)) LIMIT 1),
      (SELECT id FROM public.bank_accounts WHERE name = 'Cash on Hand' LIMIT 1)
    ),
    EXTRACT(MONTH FROM nic.payment_date),
    EXTRACT(YEAR FROM nic.payment_date)
),
combined_collections AS (
  SELECT bank_account_id, period_month, period_year, SUM(total_collected) AS total_collected
  FROM (
    SELECT * FROM monthly_payments
    UNION ALL
    SELECT * FROM monthly_non_invoice
  ) all_collections
  GROUP BY bank_account_id, period_month, period_year
),
monthly_disbursements AS (
  SELECT
    d.bank_account_id,
    d.period_month,
    d.period_year,
    SUM(d.amount) AS total_disbursed
  FROM public.disbursements d
  WHERE d.is_advance_release = false AND d.is_fund_transfer = false
  GROUP BY d.bank_account_id, d.period_month, d.period_year
)
SELECT
  COALESCE(cc.bank_account_id, md.bank_account_id) AS bank_account_id,
  COALESCE(cc.period_month, md.period_month) AS period_month,
  COALESCE(cc.period_year, md.period_year) AS period_year,
  COALESCE(cc.total_collected, 0) AS total_collected,
  COALESCE(md.total_disbursed, 0) AS total_disbursed
FROM combined_collections cc
FULL OUTER JOIN monthly_disbursements md
  ON cc.bank_account_id = md.bank_account_id
  AND cc.period_month = md.period_month
  AND cc.period_year = md.period_year;

-- 11. Create cash_advance_aging aging view
CREATE OR REPLACE VIEW public.cash_advance_aging
WITH (security_invoker = true)
AS
SELECT
  ca.id,
  ca.reference_number,
  ca.grantee_name,
  ca.advance_type,
  ca.released_amount,
  ca.outstanding_balance,
  ca.due_liquidation_date,
  (CURRENT_DATE - ca.due_liquidation_date)::INTEGER AS days_overdue,
  CASE
    WHEN CURRENT_DATE <= ca.due_liquidation_date THEN 'current'
    WHEN CURRENT_DATE - ca.due_liquidation_date <= 30  THEN '1–30 days'
    WHEN CURRENT_DATE - ca.due_liquidation_date <= 60  THEN '31–60 days'
    ELSE '60+ days'
  END AS aging_bucket
FROM public.cash_advances ca
WHERE ca.status IN ('released', 'partially_liquidated');
