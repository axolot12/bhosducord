-- Invite-safe server preview function (works for private servers via invite code only)
CREATE OR REPLACE FUNCTION public.get_invite_server(_invite_code text)
RETURNS TABLE (
  id uuid,
  name text,
  icon_url text,
  description text,
  member_count integer,
  is_public boolean,
  already_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.icon_url,
    s.description,
    s.member_count,
    s.is_public,
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = s.id
        AND sm.user_id = auth.uid()
    ) AS already_member
  FROM public.servers s
  WHERE s.invite_code = _invite_code
  LIMIT 1;
$$;

-- Atomic join by invite code (bypasses private server visibility restrictions safely)
CREATE OR REPLACE FUNCTION public.join_server_by_invite(_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.id
  INTO _server_id
  FROM public.servers s
  WHERE s.invite_code = _invite_code
  LIMIT 1;

  IF _server_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.server_members (server_id, user_id)
  VALUES (_server_id, auth.uid())
  ON CONFLICT (server_id, user_id) DO NOTHING;

  RETURN _server_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_server(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_server_by_invite(text) TO authenticated;

-- Keep member_count accurate in real-time
CREATE OR REPLACE FUNCTION public.sync_server_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
BEGIN
  _server_id := COALESCE(NEW.server_id, OLD.server_id);

  UPDATE public.servers s
  SET member_count = (
    SELECT COUNT(*)::integer
    FROM public.server_members sm
    WHERE sm.server_id = _server_id
  ),
  updated_at = now()
  WHERE s.id = _server_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS server_members_sync_member_count_insert ON public.server_members;
CREATE TRIGGER server_members_sync_member_count_insert
AFTER INSERT ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_server_member_count();

DROP TRIGGER IF EXISTS server_members_sync_member_count_delete ON public.server_members;
CREATE TRIGGER server_members_sync_member_count_delete
AFTER DELETE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_server_member_count();

-- Enforce case-insensitive unique usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique_idx
ON public.profiles ((lower(username)));