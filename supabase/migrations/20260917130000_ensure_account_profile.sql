CREATE OR REPLACE FUNCTION public.ensure_account_profile()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT := auth.jwt() ->> 'email';
  current_name TEXT := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name'
  );
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    current_user_id,
    current_name,
    current_email,
    auth.jwt() -> 'user_metadata' ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'user'::public.app_role)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_account_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_account_profile() TO authenticated;
