CREATE OR REPLACE FUNCTION public.prevent_self_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND lower(COALESCE(OLD.email, '')) = 'admin@user.dev'
  THEN
    RAISE EXCEPTION 'The bootstrap administrator cannot be disabled';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change account status.';
  END IF;
  RETURN NEW;
END;
$$;