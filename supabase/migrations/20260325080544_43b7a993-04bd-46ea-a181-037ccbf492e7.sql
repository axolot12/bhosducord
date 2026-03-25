
-- Fix infinite recursion in server_members SELECT policy
DROP POLICY IF EXISTS "Members viewable by server members" ON public.server_members;

CREATE OR REPLACE FUNCTION public.is_server_member(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE user_id = _user_id AND server_id = _server_id
  )
$$;

CREATE POLICY "Members viewable by server members"
  ON public.server_members FOR SELECT
  TO authenticated
  USING (public.is_server_member(auth.uid(), server_id));

-- Fix infinite recursion in dm_participants SELECT policy
DROP POLICY IF EXISTS "DM participants viewable by conversation members" ON public.dm_participants;

CREATE OR REPLACE FUNCTION public.is_dm_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

CREATE POLICY "DM participants viewable by conversation members"
  ON public.dm_participants FOR SELECT
  TO authenticated
  USING (public.is_dm_participant(auth.uid(), conversation_id));

-- Fix dm_participants INSERT policy (also had recursion)
DROP POLICY IF EXISTS "Users can add DM participants" ON public.dm_participants;
CREATE POLICY "Users can add DM participants"
  ON public.dm_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dm_participant(auth.uid(), conversation_id)
    OR user_id = auth.uid()
  );
