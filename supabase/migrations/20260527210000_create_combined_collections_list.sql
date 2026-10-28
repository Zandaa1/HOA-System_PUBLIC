-- Create combined_collections_list view for collections reporting dashboard
CREATE OR REPLACE VIEW public.combined_collections_list WITH (security_invoker = true) AS
SELECT
    p.id AS source_id,
    'payment'::text AS source_type,
    p.payment_number AS reference_number,
    p.amount,
    p.payment_date::text AS payment_date,
    p.payment_method,
    p.reference_number AS external_ref,
    p.created_at,
    inv.invoice_number AS parent_ref,
    prop.block AS block,
    prop.lot AS lot
FROM
    public.payments p
JOIN
    public.invoices inv ON inv.id = p.invoice_id
JOIN
    public.properties prop ON prop.id = inv.property_id

UNION ALL

SELECT
    nic.id AS source_id,
    'non_invoice'::text AS source_type,
    nic.receipt_number AS reference_number,
    nic.amount,
    nic.payment_date::text AS payment_date,
    nic.payment_method,
    nic.account AS external_ref,
    nic.created_at,
    nic.category AS parent_ref,
    NULL::text AS block,
    NULL::text AS lot
FROM
    public.non_invoice_collections nic;

-- Grant select permission to authenticated role
GRANT SELECT ON public.combined_collections_list TO authenticated;
