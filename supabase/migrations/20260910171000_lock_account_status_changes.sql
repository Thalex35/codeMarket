CREATE OR REPLACE FUNCTION public.prevent_self_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change account status.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_status_guard_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_status_change();
