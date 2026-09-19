-- ============================================================
-- Private Chat Platform — core schema (from schema.md)
-- ============================================================

-- ---------- Roles (separate table; source of truth) ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
  avatar_url text,
  theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light','dark','system')),
  last_seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX profiles_status_idx ON public.profiles(status);

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
$$;

-- keep profiles.role mirrored from user_roles (display only; user_roles is authoritative)
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles SET role = CASE WHEN public.has_role(_uid, 'admin') THEN 'admin' ELSE 'user' END WHERE id = _uid;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER user_roles_sync_profile AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- users may only change name / avatar / theme on their own profile
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    -- role is derived from user_roles only
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ---------- conversations ----------
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','read_only','archived')),
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX conversations_last_activity_idx ON public.conversations(last_activity DESC);

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants(user_id);

CREATE OR REPLACE FUNCTION public.is_participant(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants
                 WHERE conversation_id = _conversation_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.shares_conversation_with(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants a
    JOIN public.conversation_participants b ON a.conversation_id = b.conversation_id
    WHERE a.user_id = auth.uid() AND b.user_id = _other)
$$;

-- max two participants per conversation (V1)
CREATE OR REPLACE FUNCTION public.enforce_two_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.conversation_participants WHERE conversation_id = NEW.conversation_id) >= 2 THEN
    RAISE EXCEPTION 'conversation already has two participants';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER conversation_participants_limit BEFORE INSERT ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_two_participants();

-- ---------- messages ----------
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file')),
  attachment_url text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sending','sent','delivered','read','failed')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX messages_conversation_created_idx ON public.messages(conversation_id, created_at);
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_activity = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_touch_conversation AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- column-level rules for message updates
CREATE OR REPLACE FUNCTION public.enforce_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  -- immutable columns
  IF NEW.content IS DISTINCT FROM OLD.content OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.type IS DISTINCT FROM OLD.type OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url THEN
    RAISE EXCEPTION 'message content is immutable';
  END IF;
  IF OLD.sender_id = auth.uid() THEN
    -- sender: may only soft-delete own message, within 1 hour
    IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'sender cannot change status'; END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      IF OLD.deleted_at IS NOT NULL OR OLD.created_at < now() - interval '1 hour' THEN
        RAISE EXCEPTION 'deletion window has passed';
      END IF;
      NEW.deleted_at := now();
    END IF;
  ELSE
    -- recipient: may only advance status to delivered/read
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN RAISE EXCEPTION 'not allowed'; END IF;
    IF NEW.status NOT IN ('delivered','read') OR (OLD.status = 'read' AND NEW.status <> 'read') THEN
      RAISE EXCEPTION 'invalid status transition';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_enforce_update BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_update();

-- ---------- message_reports ----------
CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- ---------- alerts ----------
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','important')),
  target_scope text NOT NULL DEFAULT 'everyone' CHECK (target_scope IN ('one','multiple','everyone')),
  dismissible boolean NOT NULL DEFAULT true,
  start_time timestamptz NOT NULL DEFAULT now(),
  expiration_time timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.alert_targets (
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (alert_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_targets TO authenticated;
GRANT ALL ON public.alert_targets TO service_role;
ALTER TABLE public.alert_targets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_alert_target(_alert_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.alert_targets WHERE alert_id = _alert_id AND user_id = auth.uid())
$$;

-- ---------- welcome_message ----------
CREATE TABLE public.welcome_message (
  id int PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  icon text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.welcome_message TO authenticated;
GRANT ALL ON public.welcome_message TO service_role;
ALTER TABLE public.welcome_message ENABLE ROW LEVEL SECURITY;
INSERT INTO public.welcome_message (id, enabled, title, message, icon)
VALUES (1, true, 'أهلاً بك', 'مرحباً بك في مساحتنا الخاصة.', '✨');

-- ---------- platform_settings ----------
CREATE TABLE public.platform_settings (
  id int PRIMARY KEY CHECK (id = 1),
  platform_name text NOT NULL DEFAULT 'المنصة الخاصة',
  logo_url text,
  default_theme text NOT NULL DEFAULT 'system' CHECK (default_theme IN ('light','dark','system')),
  maintenance_mode boolean NOT NULL DEFAULT false,
  registration_enabled boolean NOT NULL DEFAULT false CHECK (registration_enabled = false),
  message_limit int DEFAULT 2000,
  attachment_limit_mb int DEFAULT 10,
  activity_log_retention_days int NOT NULL DEFAULT 90,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.platform_settings (id) VALUES (1);

-- public (pre-login) branding subset
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (platform_name text, logo_url text, default_theme text, maintenance_mode boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT platform_name, logo_url, default_theme, maintenance_mode FROM public.platform_settings WHERE id = 1
$$;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated;

-- ---------- activity_log ----------
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_log_created_idx ON public.activity_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_activity(_event_type text, _target_id uuid DEFAULT NULL, _metadata jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log (event_type, actor_id, target_id, metadata)
  VALUES (_event_type, auth.uid(), _target_id, _metadata);
END $$;

CREATE OR REPLACE FUNCTION public.purge_activity_log()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.activity_log
  WHERE created_at < now() - make_interval(days => (SELECT activity_log_retention_days FROM public.platform_settings WHERE id = 1));
END $$;

-- ---------- Admin RPCs (permission grants) ----------
CREATE OR REPLACE FUNCTION public.admin_create_conversation(_user_a uuid, _user_b uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_a = _user_b THEN RAISE EXCEPTION 'participants must differ'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.conversation_participants a
    JOIN public.conversation_participants b ON a.conversation_id = b.conversation_id
    WHERE a.user_id = _user_a AND b.user_id = _user_b) THEN
    RAISE EXCEPTION 'conversation already exists';
  END IF;
  INSERT INTO public.conversations (created_by) VALUES (auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_id, _user_a), (_id, _user_b);
  PERFORM public.log_activity('permission_changed', _id, jsonb_build_object('action','granted','users', jsonb_build_array(_user_a,_user_b)));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('active','disabled','deleted') THEN RAISE EXCEPTION 'invalid status'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot change own status'; END IF;
  UPDATE public.profiles SET status = _status,
    deleted_at = CASE WHEN _status = 'deleted' THEN now() ELSE NULL END
  WHERE id = _user_id;
  IF _status = 'deleted' THEN
    UPDATE public.conversations SET status = 'read_only'
    WHERE id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = _user_id) AND status = 'active';
  END IF;
  PERFORM public.log_activity(CASE _status WHEN 'active' THEN 'user_enabled' WHEN 'disabled' THEN 'user_disabled' ELSE 'user_deleted' END, _user_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_admin() THEN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles WHERE status <> 'deleted'),
    'active_users', (SELECT count(*) FROM public.profiles WHERE status = 'active'),
    'disabled_users', (SELECT count(*) FROM public.profiles WHERE status = 'disabled'),
    'online_users', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - interval '2 minutes'),
    'active_conversations', (SELECT count(*) FROM public.conversations WHERE status = 'active'),
    'messages', (SELECT count(*) FROM public.messages),
    'active_alerts', (SELECT count(*) FROM public.alerts WHERE active AND (expiration_time IS NULL OR expiration_time > now())),
    'open_reports', (SELECT count(*) FROM public.message_reports WHERE status = 'open')
  ) ELSE NULL END
$$;

-- user marks a whole conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_participant(_conversation_id) OR NOT public.is_active_user() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.messages SET status = 'read'
  WHERE conversation_id = _conversation_id AND sender_id <> auth.uid() AND status <> 'read';
END $$;

-- ============================================================
-- RLS policies
-- ============================================================
-- user_roles
CREATE POLICY "roles: read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- profiles
CREATE POLICY "profiles: read own, admin, or shared" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin() OR public.shares_conversation_with(id));
CREATE POLICY "profiles: update own or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- conversations
CREATE POLICY "conversations: participants or admin read" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_participant(id) AND public.is_active_user()));
CREATE POLICY "conversations: admin insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "conversations: admin update" ON public.conversations FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "conversations: admin delete" ON public.conversations FOR DELETE TO authenticated USING (public.is_admin());

-- conversation_participants
CREATE POLICY "participants: read own conversations or admin" ON public.conversation_participants FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_participant(conversation_id));
CREATE POLICY "participants: admin insert" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "participants: admin delete" ON public.conversation_participants FOR DELETE TO authenticated USING (public.is_admin());

-- messages
CREATE POLICY "messages: participants read" ON public.messages FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_participant(conversation_id) AND public.is_active_user()));
CREATE POLICY "messages: participants send" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_participant(conversation_id)
    AND public.is_active_user()
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.status = 'active')
    AND type = 'text'
  );
CREATE POLICY "messages: participants update (trigger-restricted)" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_participant(conversation_id) AND public.is_active_user()));

-- message_reports
CREATE POLICY "reports: participants insert" ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid() AND public.is_participant(conversation_id) AND public.is_active_user());
CREATE POLICY "reports: admin read" ON public.message_reports FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "reports: admin update" ON public.message_reports FOR UPDATE TO authenticated USING (public.is_admin());

-- alerts
CREATE POLICY "alerts: visible targeted active" ON public.alerts FOR SELECT TO authenticated
  USING (
    public.is_admin() OR (
      public.is_active_user() AND active AND start_time <= now()
      AND (expiration_time IS NULL OR expiration_time > now())
      AND (target_scope = 'everyone' OR public.is_alert_target(id))
    )
  );
CREATE POLICY "alerts: admin insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "alerts: admin update" ON public.alerts FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "alerts: admin delete" ON public.alerts FOR DELETE TO authenticated USING (public.is_admin());

-- alert_targets
CREATE POLICY "alert_targets: own or admin read" ON public.alert_targets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "alert_targets: admin insert" ON public.alert_targets FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "alert_targets: admin update" ON public.alert_targets FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "alert_targets: admin delete" ON public.alert_targets FOR DELETE TO authenticated USING (public.is_admin());

-- welcome_message
CREATE POLICY "welcome: authenticated read" ON public.welcome_message FOR SELECT TO authenticated USING (true);
CREATE POLICY "welcome: admin update" ON public.welcome_message FOR UPDATE TO authenticated USING (public.is_admin());

-- platform_settings (full row admin only; public subset via get_public_settings())
CREATE POLICY "settings: admin read" ON public.platform_settings FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "settings: admin update" ON public.platform_settings FOR UPDATE TO authenticated USING (public.is_admin());

-- activity_log
CREATE POLICY "activity: admin read" ON public.activity_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "activity: admin insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.welcome_message;
