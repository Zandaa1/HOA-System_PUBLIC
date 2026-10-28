-- Drop existing views to change their settings
DROP VIEW IF EXISTS public.financial_summary_by_period;
DROP VIEW IF EXISTS public.revenue_by_fee_type;
DROP VIEW IF EXISTS public.property_arrears_summary;

-- 1. Recreate Summary by Billing Period as security_invoker
CREATE OR REPLACE VIEW public.financial_summary_by_period WITH (security_invoker = true) AS
SELECT
    bp.id AS billing_period_id,
    bp.name AS billing_period_name,
    bp.start_date,
    SUM(COALESCE(i.total_amount, 0)) AS total_billed,
    SUM(COALESCE(i.amount_paid, 0)) AS total_paid,
    SUM(COALESCE(i.balance, 0)) AS total_arrears,
    COUNT(i.id) AS total_invoices,
    COUNT(i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices
FROM
    billing_periods bp
LEFT JOIN
    invoices i ON i.billing_period_id = bp.id AND i.status != 'cancelled'
GROUP BY
    bp.id, bp.name, bp.start_date
ORDER BY
    bp.start_date DESC;

-- 2. Recreate Revenue Breakdown by Fee Type as security_invoker
CREATE OR REPLACE VIEW public.revenue_by_fee_type WITH (security_invoker = true) AS
SELECT
    ft.id AS fee_type_id,
    ft.name AS fee_type_name,
    SUM(COALESCE(ii.amount, 0)) AS total_billed
FROM
    fee_types ft
JOIN
    invoice_items ii ON ii.fee_type_id = ft.id
JOIN
    invoices i ON i.id = ii.invoice_id
WHERE
    i.status != 'cancelled'
GROUP BY
    ft.id, ft.name
ORDER BY
    total_billed DESC;

-- 3. Recreate Arrears by Property as security_invoker
CREATE OR REPLACE VIEW public.property_arrears_summary WITH (security_invoker = true) AS
SELECT
    p.id AS property_id,
    p.block,
    p.lot,
    SUM(i.balance) AS total_unpaid_balance,
    COUNT(i.id) FILTER (WHERE i.status = 'overdue') AS overdue_invoice_count
FROM
    properties p
JOIN
    invoices i ON i.property_id = p.id
WHERE
    i.balance > 0 AND i.status != 'cancelled'
GROUP BY
    p.id, p.block, p.lot
HAVING
    SUM(i.balance) > 0;

-- Grant select permissions
GRANT SELECT ON public.financial_summary_by_period TO authenticated;
GRANT SELECT ON public.revenue_by_fee_type TO authenticated;
GRANT SELECT ON public.property_arrears_summary TO authenticated;
