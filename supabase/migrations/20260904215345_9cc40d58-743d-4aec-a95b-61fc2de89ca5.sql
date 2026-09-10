-- covers & screenshots: readable by everyone, writable by admin
CREATE POLICY "public_media_read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('covers','screenshots'));
CREATE POLICY "public_media_admin_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('covers','screenshots') AND public.is_admin());
CREATE POLICY "public_media_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('covers','screenshots') AND public.is_admin());
CREATE POLICY "public_media_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('covers','screenshots') AND public.is_admin());

-- avatars: own folder
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');
CREATE POLICY "avatars_write_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- software files: admin manages, users read when entitled
CREATE POLICY "software_files_admin_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'software-files' AND public.is_admin())
WITH CHECK (bucket_id = 'software-files' AND public.is_admin());

CREATE POLICY "software_files_entitled_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'software-files'
  AND EXISTS (
    SELECT 1 FROM public.software s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.published AND NOT s.archived
      AND (
        s.pricing_type = 'free'
        OR EXISTS (
          SELECT 1 FROM public.purchases p
          WHERE p.software_id = s.id AND p.user_id = auth.uid() AND p.status = 'paid'
        )
      )
  )
);