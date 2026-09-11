DROP POLICY "software_files_entitled_read" ON storage.objects;

CREATE POLICY "software_files_entitled_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'software-files'
  AND EXISTS (
    SELECT 1
    FROM public.software s
    WHERE s.slug = (storage.foldername(name))[1]
      AND s.published
      AND NOT s.archived
      AND (
        s.pricing_type = 'free'
        OR EXISTS (
          SELECT 1
          FROM public.purchases p
          WHERE p.software_id = s.id
            AND p.user_id = auth.uid()
            AND p.status = 'paid'
        )
      )
  )
);
