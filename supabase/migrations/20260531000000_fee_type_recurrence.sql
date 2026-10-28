-- Replace boolean is_recurring with text enum recurrence (monthly/yearly/one_time)
-- Gate sticker fee (is_recurring: false) becomes recurrence: 'one_time'
-- Existing recurring fees become 'monthly'

ALTER TABLE fee_types ADD COLUMN recurrence text CHECK (recurrence IN ('monthly', 'yearly', 'one_time'));

UPDATE fee_types SET recurrence = CASE WHEN is_recurring THEN 'monthly' ELSE 'one_time' END;

ALTER TABLE fee_types ALTER COLUMN recurrence SET NOT NULL;

ALTER TABLE fee_types DROP COLUMN is_recurring;
