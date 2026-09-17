CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_is_admin BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete users.';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot delete their own account.';
  END IF;

  SELECT public.has_role(_user_id, 'admin') INTO target_is_admin;
  IF target_is_admin THEN
    RAISE EXCEPTION 'Administrator accounts cannot be deleted here.';
  END IF;

  DELETE FROM public.messages WHERE user_id = _user_id;
  DELETE FROM public.likes WHERE user_id = _user_id;
  DELETE FROM public.downloads WHERE user_id = _user_id;
  DELETE FROM public.purchases WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  DELETE FROM public.software_screenshots
  WHERE software_id IN (SELECT id FROM public.software WHERE owner_id = _user_id);
  DELETE FROM public.software_versions
  WHERE software_id IN (SELECT id FROM public.software WHERE owner_id = _user_id);
  DELETE FROM public.software WHERE owner_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
