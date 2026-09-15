CREATE OR REPLACE FUNCTION public.set_user_role(
  _user_id UUID,
  _role public.app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  target_email TEXT;
  target_is_admin BOOLEAN;
  admin_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles'
      USING ERRCODE = '42501';
  END IF;

  SELECT lower(COALESCE(email, ''))
  INTO target_email
  FROM public.profiles
  WHERE id = _user_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF target_email = 'admin@user.dev' AND _role <> 'admin' THEN
    RAISE EXCEPTION 'The bootstrap administrator cannot be demoted';
  END IF;

  IF _user_id = auth.uid() AND _role <> 'admin' THEN
    RAISE EXCEPTION 'Administrators cannot demote themselves';
  END IF;

  SELECT public.has_role(_user_id, 'admin') INTO target_is_admin;
  SELECT count(*)::INTEGER INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF target_is_admin AND _role = 'user' AND admin_count <= 1 THEN
    RAISE EXCEPTION 'The last administrator cannot be demoted';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role) TO authenticated;

UPDATE public.site_settings
SET value = 'admin@user.dev'
WHERE key = 'admin_email';

DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id
  FROM public.profiles
  WHERE lower(COALESCE(email, '')) = 'admin@user.dev'
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(COALESCE(email, '')) = 'admin@user.dev'
ON CONFLICT DO NOTHING;
