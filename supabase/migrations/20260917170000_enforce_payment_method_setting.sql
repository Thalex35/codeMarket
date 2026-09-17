CREATE OR REPLACE FUNCTION public.validate_purchase_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  configured TEXT;
BEGIN
  SELECT value INTO configured
  FROM public.site_settings
  WHERE key = 'payment_methods';
  configured := COALESCE(NULLIF(configured, ''), 'both');

  IF NEW.payment_method = 'whatsapp' AND configured NOT IN ('whatsapp', 'both') THEN
    RAISE EXCEPTION 'WhatsApp payments are not enabled';
  END IF;
  IF NEW.payment_method = 'official-moncash' AND configured NOT IN ('official-moncash', 'both') THEN
    RAISE EXCEPTION 'Official MonCash payments are not enabled';
  END IF;
  IF NEW.payment_method NOT IN ('whatsapp', 'official-moncash') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchases_payment_method_trg ON public.purchases;
CREATE TRIGGER purchases_payment_method_trg
BEFORE INSERT OR UPDATE OF payment_method ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_payment_method();
