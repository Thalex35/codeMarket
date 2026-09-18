ALTER TABLE public.software
  ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.software AS software
SET view_count = views.count
FROM (
  SELECT software_id, count(*)::INTEGER AS count
  FROM public.analytics_events
  WHERE event_type = 'software_view' AND software_id IS NOT NULL
  GROUP BY software_id
) AS views
WHERE software.id = views.software_id;

CREATE OR REPLACE FUNCTION public.sync_software_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'software_view' AND NEW.software_id IS NOT NULL THEN
    UPDATE public.software
    SET view_count = view_count + 1
    WHERE id = NEW.software_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_software_view_count_trg ON public.analytics_events;
CREATE TRIGGER analytics_software_view_count_trg
AFTER INSERT ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.sync_software_view_count();

REVOKE ALL ON FUNCTION public.sync_software_view_count() FROM anon, authenticated, public;
