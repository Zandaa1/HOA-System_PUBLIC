DO $$
BEGIN
    -- Table for Property Transfers
    CREATE TABLE IF NOT EXISTS public.property_transfers (
        id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
        property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
        from_homeowner_id uuid REFERENCES public.homeowners(id) ON DELETE SET NULL,
        to_homeowner_id uuid REFERENCES public.homeowners(id) ON DELETE SET NULL,
        transfer_date date NOT NULL DEFAULT CURRENT_DATE,
        transfer_type text CHECK (transfer_type IN ('sale', 'inheritance', 'donation', 'other')),
        transfer_fee numeric(10,2) DEFAULT 0,
        remarks text,
        created_at timestamp with time zone DEFAULT now(),
        processed_by uuid REFERENCES public.staff(id)
    );

    -- Enable RLS
    ALTER TABLE public.property_transfers ENABLE ROW LEVEL SECURITY;

    -- Staff can do everything
    EXECUTE 'DROP POLICY IF EXISTS "staff_all_property_transfers" ON public.property_transfers';
    EXECUTE 'CREATE POLICY "staff_all_property_transfers" ON public.property_transfers FOR ALL TO authenticated USING (public.is_staff())';
END $$;
