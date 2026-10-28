DO $$
BEGIN
    -- Create bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attachments', 'attachments', true)
    ON CONFLICT (id) DO NOTHING;

    -- Public Access Policy
    EXECUTE 'DROP POLICY IF EXISTS "Public Access" ON storage.objects';
    EXECUTE 'CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id = ''attachments'')';

    -- Authenticated Upload Policy
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects';
    EXECUTE 'CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''attachments'')';

    -- Staff Delete Policy
    EXECUTE 'DROP POLICY IF EXISTS "Staff Delete Attachments" ON storage.objects';
    EXECUTE 'CREATE POLICY "Staff Delete Attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''attachments'' AND EXISTS (
        SELECT 1 FROM public.staff 
        WHERE user_id = auth.uid() 
        AND is_active = true
    ))';
END $$;
