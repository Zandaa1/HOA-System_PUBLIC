-- Migration: cash_flow_rollup view
-- Aggregates payments and disbursements by bank account, month, and year
-- for efficient cash flow reporting.

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
