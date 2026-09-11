ALTER TABLE public.purchases
  DROP CONSTRAINT purchases_payment_method_valid,
  ADD CONSTRAINT purchases_payment_method_valid CHECK (payment_method IN ('whatsapp', 'moncashconnect')),
  ADD COLUMN provider TEXT,
  ADD COLUMN provider_reference TEXT,
  ADD COLUMN checkout_url TEXT,
  ADD COLUMN charged_amount INTEGER,
  ADD COLUMN charged_currency TEXT,
  ADD COLUMN paid_at TIMESTAMPTZ;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_provider_reference_unique UNIQUE (provider, provider_reference);

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

  IF NEW.status <> 'pending' OR NOT (NEW.payment_method IN ('whatsapp', 'moncashconnect')) THEN
    RAISE EXCEPTION 'Invalid purchase request state.';
  END IF;

  RETURN NEW;
END;
$$;
