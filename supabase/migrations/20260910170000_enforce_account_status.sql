ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_valid CHECK (status IN ('active', 'disabled'));

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$;

DROP POLICY "likes_insert_own" ON public.likes;
CREATE POLICY "likes_insert_own" ON public.likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY "downloads_insert_own" ON public.downloads;
CREATE POLICY "downloads_insert_own" ON public.downloads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY "purchases_insert_own" ON public.purchases;
CREATE POLICY "purchases_insert_own" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user() AND status = 'pending');

DROP POLICY "software_files_entitled_read" ON storage.objects;
CREATE POLICY "software_files_entitled_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'software-files'
  AND public.is_active_user()
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
