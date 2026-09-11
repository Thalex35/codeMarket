ALTER TABLE public.messages
  ADD CONSTRAINT messages_name_length CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
  ADD CONSTRAINT messages_email_length CHECK (char_length(trim(email)) BETWEEN 3 AND 255),
  ADD CONSTRAINT messages_subject_length CHECK (char_length(trim(subject)) BETWEEN 3 AND 150),
  ADD CONSTRAINT messages_body_length CHECK (char_length(trim(message)) BETWEEN 10 AND 2000),
  ADD CONSTRAINT messages_status_valid CHECK (status IN ('unread', 'read', 'archived'));

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_event_type_valid CHECK (
    event_type IN (
      'page_view',
      'software_view',
      'download',
      'like',
      'unlike',
      'signup',
      'login',
      'purchase_request',
      'contact'
    )
  ),
  ADD CONSTRAINT analytics_metadata_size CHECK (pg_column_size(metadata) <= 8192);

DROP POLICY "messages_anyone_insert" ON public.messages;
CREATE POLICY "messages_anyone_insert" ON public.messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY "analytics_insert" ON public.analytics_events;
CREATE POLICY "analytics_insert" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
