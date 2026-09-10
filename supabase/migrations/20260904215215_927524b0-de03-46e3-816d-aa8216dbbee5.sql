-- ROLES
CREATE TYPE public.app_role AS ENUM ('user','admin');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- signup handler: create profile + assign role (first user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_admin BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_admin;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_admin THEN 'user'::public.app_role ELSE 'admin'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- SOFTWARE
CREATE TABLE public.software (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  platform TEXT NOT NULL DEFAULT 'Windows',
  pricing_type TEXT NOT NULL DEFAULT 'free',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cover_url TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.software TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.software TO authenticated;
GRANT ALL ON public.software TO service_role;
ALTER TABLE public.software ENABLE ROW LEVEL SECURITY;
CREATE POLICY "software_public_read" ON public.software FOR SELECT TO anon, authenticated USING ((published AND NOT archived) OR public.is_admin());
CREATE POLICY "software_admin_insert" ON public.software FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "software_admin_update" ON public.software FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "software_admin_delete" ON public.software FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER software_updated BEFORE UPDATE ON public.software FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.software_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL REFERENCES public.software(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.software_screenshots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.software_screenshots TO authenticated;
GRANT ALL ON public.software_screenshots TO service_role;
ALTER TABLE public.software_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shots_public_read" ON public.software_screenshots FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.software s WHERE s.id = software_id AND ((s.published AND NOT s.archived) OR public.is_admin())));
CREATE POLICY "shots_admin_write" ON public.software_screenshots FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.software_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id UUID NOT NULL REFERENCES public.software(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  file_path TEXT,
  file_size TEXT,
  release_notes TEXT,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minimum_os TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.software_versions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.software_versions TO authenticated;
GRANT ALL ON public.software_versions TO service_role;
ALTER TABLE public.software_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_public_read" ON public.software_versions FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.software s WHERE s.id = software_id AND ((s.published AND NOT s.archived) OR public.is_admin())));
CREATE POLICY "versions_admin_write" ON public.software_versions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- LIKES
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  software_id UUID NOT NULL REFERENCES public.software(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, software_id)
);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON public.likes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.sync_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.software SET like_count = like_count + 1 WHERE id = NEW.software_id;
    RETURN NEW;
  ELSE
    UPDATE public.software SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.software_id;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER likes_count_trg AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.sync_like_count();

-- DOWNLOADS
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  software_id UUID NOT NULL REFERENCES public.software(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.software_versions(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads_select" ON public.downloads FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "downloads_insert_own" ON public.downloads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_download_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.software SET download_count = download_count + 1 WHERE id = NEW.software_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER downloads_count_trg AFTER INSERT ON public.downloads FOR EACH ROW EXECUTE FUNCTION public.sync_download_count();

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  software_id UUID NOT NULL REFERENCES public.software(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "purchases_insert_own" ON public.purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "purchases_admin_update" ON public.purchases FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_anyone_insert" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "messages_admin_read" ON public.messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "messages_admin_update" ON public.messages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "messages_admin_delete" ON public.messages FOR DELETE TO authenticated USING (public.is_admin());

-- ANALYTICS
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  software_id UUID REFERENCES public.software(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_insert" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "analytics_admin_read" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_admin());

-- SETTINGS
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name','CodeMarket'),
  ('site_description','Discover software built to make work easier.'),
  ('contact_email','hello@codemarket.app'),
  ('whatsapp_number','+50900000000'),
  ('currency','USD'),
  ('facebook_url',''),
  ('twitter_url',''),
  ('linkedin_url',''),
  ('github_url','');

-- SEED SOFTWARE
INSERT INTO public.software (name, slug, short_description, description, category, platform, pricing_type, price, features, requirements, featured, published, download_count, like_count) VALUES
('TeacherHer','teacherher','Student and classroom management for schools.','TeacherHer is a complete school management application that helps teachers and administrators handle students, classes, attendance and reporting from one place. It works offline and keeps every record safe on the local machine.','Education','Windows','paid',49.00,ARRAY['Student management','Class management','Attendance tracking','Grade reports','Events calendar','Search and filtering'],'{"os":"Windows 10 or later","ram":"4 GB","storage":"500 MB","other":"1280x720 display"}'::jsonb,true,true,1240,86),
('Children Management','children-management','Church children ministry management made simple.','Children Management helps churches register children, track attendance for each service, manage guardians and print reports for the ministry team.','Church','Windows','free',0,ARRAY['Child registration','Guardian records','Service attendance','Printable reports','Birthday reminders'],'{"os":"Windows 10 or later","ram":"2 GB","storage":"300 MB","other":"None"}'::jsonb,true,true,860,54),
('TaskMe','taskme','A focused task and productivity manager.','TaskMe keeps your daily work organised with projects, priorities, reminders and a clean focus mode designed for people who want less noise.','Productivity','Cross-platform','free',0,ARRAY['Projects and lists','Priorities and due dates','Reminders','Focus mode','Dark theme'],'{"os":"Windows, macOS or Linux","ram":"2 GB","storage":"200 MB","other":"None"}'::jsonb,true,true,2130,142),
('Dentary Clinic Management','dentary-clinic-management','Patient and appointment management for dental clinics.','Dentary helps dental clinics manage patient files, appointments, treatments and invoices, with a clear daily agenda for the whole team.','Healthcare','Windows','paid',129.00,ARRAY['Patient files','Appointment agenda','Treatment history','Invoices','Clinic reports'],'{"os":"Windows 10 or later","ram":"8 GB","storage":"1 GB","other":"Printer recommended"}'::jsonb,false,true,410,37),
('StockPoint','stockpoint','Inventory and sales tracking for small businesses.','StockPoint tracks products, stock movements, suppliers and daily sales so small shops always know what they have and what sells best.','Business','Windows','paid',79.00,ARRAY['Product catalog','Stock movements','Supplier records','Daily sales','Low stock alerts'],'{"os":"Windows 10 or later","ram":"4 GB","storage":"600 MB","other":"None"}'::jsonb,false,true,530,29),
('MediaBox','mediabox','A lightweight local media library and player.','MediaBox organises your local videos and music into a clean library with playlists, resume playback and quick search.','Entertainment','Cross-platform','free',0,ARRAY['Media library','Playlists','Resume playback','Quick search'],'{"os":"Windows, macOS or Linux","ram":"2 GB","storage":"150 MB","other":"None"}'::jsonb,false,true,970,61);

INSERT INTO public.software_versions (software_id, version, file_size, release_notes, release_date, minimum_os, is_current)
SELECT s.id, v.version, v.size, v.notes, v.rdate::date, v.mos, v.cur
FROM public.software s
JOIN (VALUES
  ('teacherher','1.3.0','82 MB','Attendance export, faster reports and bug fixes.','2026-06-14','Windows 10',true),
  ('teacherher','1.2.0','78 MB','New events calendar and grade improvements.','2026-02-02','Windows 10',false),
  ('teacherher','1.0.0','71 MB','First public release.','2025-08-19','Windows 10',false),
  ('children-management','2.1.0','44 MB','Birthday reminders and printable reports.','2026-05-05','Windows 10',true),
  ('children-management','2.0.0','41 MB','Rebuilt attendance module.','2025-11-11','Windows 10',false),
  ('taskme','1.5.2','36 MB','Focus mode improvements and dark theme polish.','2026-07-01','Any',true),
  ('taskme','1.4.0','34 MB','Reminders and recurring tasks.','2026-01-20','Any',false),
  ('dentary-clinic-management','1.1.0','96 MB','Invoice templates and agenda printing.','2026-04-09','Windows 10',true),
  ('stockpoint','1.0.4','58 MB','Low stock alerts and supplier notes.','2026-03-17','Windows 10',true),
  ('mediabox','0.9.1','28 MB','Playlist ordering and resume playback.','2026-06-28','Any',true)
) AS v(slug,version,size,notes,rdate,mos,cur) ON v.slug = s.slug;