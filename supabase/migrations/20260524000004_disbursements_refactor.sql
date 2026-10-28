-- Migration: Refactor disbursements table
-- Adds bank_account_id FK, prepared_by, period_month/year, normalizes categories, drops free-text account.

-- Step 1: Add new columns
ALTER TABLE public.disbursements
  ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id),
  ADD COLUMN prepared_by TEXT,
  ADD COLUMN period_month INTEGER,
  ADD COLUMN period_year INTEGER;

-- Step 2: Backfill period_month and period_year from existing payment_date
UPDATE public.disbursements
  SET period_month = EXTRACT(MONTH FROM payment_date),
      period_year = EXTRACT(YEAR FROM payment_date);

-- Step 3: Map free-text account column to bank_account_id FK
UPDATE public.disbursements d
  SET bank_account_id = ba.id
  FROM public.bank_accounts ba
  WHERE LOWER(TRIM(d.account)) = LOWER(TRIM(ba.name));

-- Step 4: Normalize category values to new enum
UPDATE public.disbursements SET category = 'others' WHERE LOWER(category) IN ('transportation', 'representation', 'other');
UPDATE public.disbursements SET category = 'refund_bond' WHERE LOWER(category) = 'bond refund';
UPDATE public.disbursements SET category = 'utility' WHERE LOWER(category) = 'utility';
UPDATE public.disbursements SET category = 'salary' WHERE LOWER(category) = 'salary';
UPDATE public.disbursements SET category = 'repairs' WHERE LOWER(category) = 'repairs';
UPDATE public.disbursements SET category = 'security' WHERE LOWER(category) = 'security';
UPDATE public.disbursements SET category = 'supplies' WHERE LOWER(category) = 'supplies';
UPDATE public.disbursements SET category = 'legal' WHERE LOWER(category) = 'legal';
UPDATE public.disbursements SET category = 'transfer' WHERE LOWER(category) = 'transfer';

-- Step 5: Add CHECK constraint for normalized categories
ALTER TABLE public.disbursements
  ADD CONSTRAINT disbursements_category_check
  CHECK (category IN ('utility', 'salary', 'repairs', 'security', 'supplies', 'legal', 'refund_bond', 'transfer', 'others'));

-- Step 6: Make bank_account_id NOT NULL after migration
ALTER TABLE public.disbursements
  ALTER COLUMN bank_account_id SET NOT NULL;

-- Step 7: Drop free-text account column
ALTER TABLE public.disbursements
  DROP COLUMN account;

-- Step 8: Update audit trigger to reflect new schema
-- The existing audit trigger on disbursements still works since the trigger function
-- uses TG_OP and OLD/NEW row data dynamically.
