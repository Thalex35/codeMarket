CREATE OR REPLACE FUNCTION public.enforce_paid_download_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  software_pricing TEXT;
BEGIN
  SELECT pricing_type INTO software_pricing
  FROM public.software
  WHERE id = NEW.software_id;

  IF software_pricing = 'paid' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.purchases
      WHERE user_id = NEW.user_id
        AND software_id = NEW.software_id
        AND status = 'paid'
    ) THEN
      RAISE EXCEPTION 'Paid software downloads require a paid purchase.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER downloads_access_trg
BEFORE INSERT ON public.downloads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_paid_download_access();
