ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_status_valid CHECK (status IN ('pending', 'paid', 'rejected', 'cancelled')),
  ADD CONSTRAINT purchases_payment_method_valid CHECK (payment_method IN ('whatsapp'));

CREATE OR REPLACE FUNCTION public.validate_purchase_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  software_record public.software%ROWTYPE;
BEGIN
  SELECT * INTO software_record
  FROM public.software
  WHERE id = NEW.software_id;

  IF software_record.id IS NULL THEN
    RAISE EXCEPTION 'The selected software does not exist.';
  END IF;

  IF software_record.pricing_type <> 'paid' OR software_record.archived OR NOT software_record.published THEN
    RAISE EXCEPTION 'Purchase requests are only available for published paid software.';
  END IF;

  IF NEW.amount <> software_record.price OR NEW.currency <> software_record.currency THEN
    RAISE EXCEPTION 'Purchase amount and currency do not match the software price.';
  END IF;

  IF NEW.status <> 'pending' OR NEW.payment_method <> 'whatsapp' THEN
    RAISE EXCEPTION 'Invalid purchase request state.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER purchases_validate_request_trg
BEFORE INSERT ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.validate_purchase_request();
