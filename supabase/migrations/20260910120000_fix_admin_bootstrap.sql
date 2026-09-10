CREATE OR REPLACE FUNCTION public.get_admin_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT value
  FROM public.site_settings
  WHERE key = 'admin_email'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  configured_admin_email TEXT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  configured_admin_email := lower(COALESCE(public.get_admin_email(), ''));
  assigned_role := CASE
    WHEN configured_admin_email <> '' AND lower(COALESCE(NEW.email, '')) = configured_admin_email THEN 'admin'::public.app_role
    ELSE 'user'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

INSERT INTO public.site_settings (key, value)
VALUES ('admin_email', 'hello@codemarket.app')
ON CONFLICT (key) DO NOTHING;
