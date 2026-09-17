INSERT INTO public.site_settings (key, value)
VALUES ('payment_methods', 'both')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_user_role(
  _user_id UUID,
  _role public.app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  target_is_admin BOOLEAN;
  admin_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'User profile not found';
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

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role) TO authenticated;
