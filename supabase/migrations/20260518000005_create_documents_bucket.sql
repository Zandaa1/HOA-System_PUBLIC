-- Create HOA Documents Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for documents bucket

-- Everyone can read documents
CREATE POLICY "Public Document Access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

-- Only staff can insert/update/delete documents
CREATE POLICY "Staff Document Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND public.is_staff()
);

CREATE POLICY "Staff Document Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents' AND public.is_staff()
);

CREATE POLICY "Staff Document Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'documents' AND public.is_staff()
);
