CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx
  ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS downloads_user_id_idx
  ON public.downloads (user_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx
  ON public.likes (user_id);
CREATE INDEX IF NOT EXISTS purchases_user_id_idx
  ON public.purchases (user_id);

CREATE OR REPLACE FUNCTION public.admin_analytics_summary(_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_at TIMESTAMPTZ;
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view analytics' USING ERRCODE = '42501';
  END IF;
  since_at := CASE WHEN _days > 0 THEN now() - make_interval(days => LEAST(_days, 3650)) ELSE NULL END;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.analytics_events WHERE since_at IS NULL OR created_at >= since_at),
    'by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', event_type, 'count', total) ORDER BY total DESC)
      FROM (
        SELECT event_type, count(*)::INTEGER AS total
        FROM public.analytics_events
        WHERE since_at IS NULL OR created_at >= since_at
        GROUP BY event_type
      ) grouped_types
    ), '[]'::JSONB),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', day, 'count', total) ORDER BY day)
      FROM (
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, count(*)::INTEGER AS total
        FROM public.analytics_events
        WHERE since_at IS NULL OR created_at >= since_at
        GROUP BY created_at::date
      ) grouped_days
    ), '[]'::JSONB)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_summary(_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view the dashboard' USING ERRCODE = '42501';
  END IF;
  since_at := CASE WHEN _days > 0 THEN now() - make_interval(days => LEAST(_days, 3650)) ELSE NULL END;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'software', (SELECT count(*) FROM public.software),
    'downloads', (SELECT count(*) FROM public.downloads),
    'likes', (SELECT count(*) FROM public.likes),
    'purchases', (SELECT count(*) FROM public.purchases),
    'pending', (SELECT count(*) FROM public.purchases WHERE status = 'pending'),
    'unread', (SELECT count(*) FROM public.messages WHERE status = 'unread'),
    'downloads_by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', day, 'count', total) ORDER BY day)
      FROM (
        SELECT to_char(downloaded_at::date, 'YYYY-MM-DD') AS day, count(*)::INTEGER AS total
        FROM public.downloads
        WHERE since_at IS NULL OR downloaded_at >= since_at
        GROUP BY downloaded_at::date
      ) grouped_downloads
    ), '[]'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_users_page(_page INTEGER DEFAULT 1, _page_size INTEGER DEFAULT 25)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  role public.app_role,
  downloads BIGINT,
  likes BIGINT,
  purchases BIGINT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.status, p.created_at,
    COALESCE(r.role, 'user'::public.app_role),
    (SELECT count(*) FROM public.downloads d WHERE d.user_id = p.id),
    (SELECT count(*) FROM public.likes l WHERE l.user_id = p.id),
    (SELECT count(*) FROM public.purchases pu WHERE pu.user_id = p.id),
    count(*) OVER ()
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT role FROM public.user_roles WHERE user_id = p.id ORDER BY role DESC LIMIT 1
  ) r ON true
  WHERE public.is_admin()
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(_page_size, 1), 100)
  OFFSET GREATEST(_page - 1, 0) * LEAST(GREATEST(_page_size, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_summary(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_dashboard_summary(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users_page(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users_page(INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_download_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.software_versions v
    WHERE v.id = NEW.version_id AND v.software_id = NEW.software_id
  ) THEN
    RAISE EXCEPTION 'Download version does not belong to the selected software';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS downloads_version_matches_software_trg ON public.downloads;
CREATE TRIGGER downloads_version_matches_software_trg
BEFORE INSERT OR UPDATE ON public.downloads
FOR EACH ROW EXECUTE FUNCTION public.validate_download_version();

DROP POLICY IF EXISTS "messages_anyone_insert" ON public.messages;
DROP POLICY IF EXISTS "analytics_insert" ON public.analytics_events;
REVOKE INSERT ON public.messages FROM anon, authenticated;
REVOKE INSERT ON public.analytics_events FROM anon, authenticated;
REVOKE INSERT ON public.downloads FROM authenticated;
