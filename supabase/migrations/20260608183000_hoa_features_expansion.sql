-- 1. Construction Permits & Refundable Bonds Workflow
CREATE TABLE IF NOT EXISTS public.construction_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  applicant_name text NOT NULL,
  permit_type text NOT NULL CHECK (permit_type IN ('renovation', 'new_construction', 'demolition', 'other')),
  description text,
  start_date date NOT NULL,
  estimated_end_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
  permit_fee numeric(10,2) NOT NULL DEFAULT 0.00,
  bond_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  permit_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  bond_deposit_id uuid REFERENCES public.advance_deposits(id) ON DELETE SET NULL,
  bond_refunded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Digital Ballot & Board Elections
CREATE TABLE IF NOT EXISTS public.ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ballot_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid REFERENCES public.ballots(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ballot_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid REFERENCES public.ballots(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  voted_by_resident_id uuid NOT NULL,
  voted_by_resident_type text NOT NULL CHECK (voted_by_resident_type IN ('homeowner', 'renter')),
  option_id uuid REFERENCES public.ballot_options(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ballot_votes_ballot_property_key UNIQUE (ballot_id, property_id)
);

-- RLS Enablement
ALTER TABLE public.construction_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_votes ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.construction_permits TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ballots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ballot_options TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ballot_votes TO anon, authenticated, service_role;

-- RLS Policies
-- construction_permits
CREATE POLICY permits_staff_all ON public.construction_permits TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY permits_resident_select ON public.construction_permits FOR SELECT TO authenticated
  USING (public.is_property_owner(property_id));

CREATE POLICY permits_resident_insert ON public.construction_permits FOR INSERT TO authenticated
  WITH CHECK (public.is_property_owner(property_id));

CREATE POLICY permits_resident_update ON public.construction_permits FOR UPDATE TO authenticated
  USING (public.is_property_owner(property_id) AND status = 'pending')
  WITH CHECK (public.is_property_owner(property_id) AND status = 'pending');

-- ballots
CREATE POLICY ballots_select ON public.ballots FOR SELECT TO authenticated
  USING (is_active = true OR public.is_staff());

CREATE POLICY ballots_staff_all ON public.ballots TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ballot_options
CREATE POLICY options_select ON public.ballot_options FOR SELECT TO authenticated
  USING (true);

CREATE POLICY options_staff_all ON public.ballot_options TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ballot_votes
CREATE POLICY votes_staff_select ON public.ballot_votes FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY votes_resident_select ON public.ballot_votes FOR SELECT TO authenticated
  USING (public.is_property_owner(property_id));

CREATE POLICY votes_resident_insert ON public.ballot_votes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_property_owner(property_id) AND
    EXISTS (
      SELECT 1 FROM public.ballots b 
      WHERE b.id = ballot_id AND b.is_active = true AND now() BETWEEN b.start_date AND b.end_date
    )
  );

-- 3. Automated Monthly Dues Scheduler functions
CREATE OR REPLACE FUNCTION public.generate_monthly_dues(p_billing_period_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_billing_period_name text;
  v_billing_period_start date;
  v_billing_period_due date;
  v_monthly_dues_base numeric;
  v_billing_due_offset integer;
  v_fee_type_id uuid;
  v_prop record;
  v_dues_amount numeric;
  v_invoice_number text;
  v_invoice_id uuid;
  v_count integer := 0;
  v_existing_id uuid;
BEGIN
  -- 1. Get billing period info
  SELECT name, start_date, due_date 
  INTO v_billing_period_name, v_billing_period_start, v_billing_period_due
  FROM public.billing_periods 
  WHERE id = p_billing_period_id;

  IF v_billing_period_name IS NULL THEN
    RAISE EXCEPTION 'Billing period not found.';
  END IF;

  -- 2. Fetch dues base settings
  SELECT COALESCE(setting_value, '500')::numeric 
  INTO v_monthly_dues_base 
  FROM public.system_settings 
  WHERE setting_key = 'monthly_dues_base';

  -- 3. Find/create correct fee type
  SELECT id INTO v_fee_type_id 
  FROM public.fee_types 
  WHERE name ILIKE '%Association Dues%' OR name ILIKE '%Monthly Dues%'
  LIMIT 1;

  IF v_fee_type_id IS NULL THEN
    INSERT INTO public.fee_types (name, recurrence, default_amount, is_active)
    VALUES ('Monthly Association Dues', 'monthly', v_monthly_dues_base, true)
    RETURNING id INTO v_fee_type_id;
  END IF;

  -- 4. Process all properties with active residents
  FOR v_prop IN 
    SELECT p.id, p.block, p.lot, p.monthly_dues_override, pt.default_monthly_dues
    FROM public.properties p
    LEFT JOIN public.property_types pt ON p.property_type_id = pt.id
    WHERE EXISTS (
      SELECT 1 FROM public.homeowners h 
      WHERE h.property_id = p.id AND h.is_active = true
    ) OR EXISTS (
      SELECT 1 FROM public.renters r 
      WHERE r.property_id = p.id AND r.is_active = true
    )
  LOOP
    -- Check for existing invoice for this period
    SELECT id INTO v_existing_id
    FROM public.invoices
    WHERE property_id = v_prop.id AND billing_period_id = p_billing_period_id
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      -- Calculate dues
      v_dues_amount := COALESCE(v_prop.monthly_dues_override, v_prop.default_monthly_dues, v_monthly_dues_base);

      -- Invoice number structure: INV-DUES-B<block>L<lot>-YYYYMM
      v_invoice_number := 'INV-DUES-B' || v_prop.block || 'L' || v_prop.lot || '-' || to_char(v_billing_period_start, 'YYYYMM');

      -- Create Invoice
      INSERT INTO public.invoices (
        invoice_number,
        property_id,
        billing_period_id,
        issue_date,
        due_date,
        subtotal,
        total_amount,
        balance,
        status,
        notes
      ) VALUES (
        v_invoice_number,
        v_prop.id,
        p_billing_period_id,
        v_billing_period_start,
        v_billing_period_due,
        v_dues_amount,
        v_dues_amount,
        v_dues_amount,
        'pending',
        'Auto-generated Monthly Association Dues'
      ) RETURNING id INTO v_invoice_id;

      -- Add Item
      INSERT INTO public.invoice_items (
        invoice_id,
        fee_type_id,
        description,
        quantity,
        unit_price,
        amount
      ) VALUES (
        v_invoice_id,
        v_fee_type_id,
        'Monthly Association Dues',
        1,
        v_dues_amount,
        v_dues_amount
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_generate_monthly_dues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_billing_period_id uuid;
  v_month_name text;
  v_start_date date;
  v_end_date date;
  v_due_date date;
  v_offset integer;
BEGIN
  -- Calculate dates for current month
  v_start_date := date_trunc('month', now())::date;
  v_end_date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  v_month_name := to_char(v_start_date, 'Month YYYY');
  
  -- Trim whitespace from month name
  v_month_name := trim(v_month_name);

  -- Fetch offset
  SELECT COALESCE(setting_value, '15')::integer
  INTO v_offset
  FROM public.system_settings
  WHERE setting_key = 'billing_due_offset_days';

  v_due_date := v_start_date + (v_offset - 1);

  -- Find or create billing period
  SELECT id INTO v_billing_period_id
  FROM public.billing_periods
  WHERE name = v_month_name
  LIMIT 1;

  IF v_billing_period_id IS NULL THEN
    INSERT INTO public.billing_periods (name, start_date, end_date, due_date, is_closed)
    VALUES (v_month_name, v_start_date, v_end_date, v_due_date, false)
    RETURNING id INTO v_billing_period_id;
  END IF;

  -- Generate Dues
  PERFORM public.generate_monthly_dues(v_billing_period_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_apply_late_penalties()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_late_fee_type text;
  v_late_fee_val numeric;
  v_grace_days integer;
  v_check_date date;
  v_inv record;
  v_penalty_amount numeric;
  v_count integer := 0;
BEGIN
  -- Fetch penalty settings
  SELECT COALESCE(setting_value, 'percentage')
  INTO v_late_fee_type
  FROM public.system_settings
  WHERE setting_key = 'late_fee_type';

  SELECT COALESCE(setting_value, '2')::numeric
  INTO v_late_fee_val
  FROM public.system_settings
  WHERE setting_key = 'late_fee_value';

  SELECT COALESCE(setting_value, '0')::integer
  INTO v_grace_days
  FROM public.system_settings
  WHERE setting_key = 'penalty_grace_period_days';

  v_check_date := (now() - (v_grace_days || ' days')::interval)::date;

  FOR v_inv IN
    SELECT id, balance, penalty_amount, total_amount
    FROM public.invoices
    WHERE status IN ('pending', 'partial') AND due_date < v_check_date
  LOOP
    IF v_late_fee_type = 'fixed' THEN
      v_penalty_amount := v_late_fee_val;
    ELSE
      v_penalty_amount := v_inv.balance * (v_late_fee_val / 100.0);
    END IF;

    IF v_penalty_amount > 0 THEN
      -- Create Penalty record
      INSERT INTO public.penalties (
        invoice_id,
        penalty_type,
        amount,
        applied_date,
        description
      ) VALUES (
        v_inv.id,
        'late_fee',
        v_penalty_amount,
        now()::date,
        'Auto-applied monthly late payment penalty (' || v_late_fee_val || CASE WHEN v_late_fee_type = 'fixed' THEN ' PHP)' ELSE '% interest)' END
      );

      -- Update Invoice
      UPDATE public.invoices
      SET
        status = 'overdue',
        penalty_amount = COALESCE(penalty_amount, 0) + v_penalty_amount,
        total_amount = total_amount + v_penalty_amount,
        balance = balance + v_penalty_amount,
        updated_at = now()
      WHERE id = v_inv.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
