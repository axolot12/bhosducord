-- Ensure server owner is always the authenticated user at insert time
CREATE OR REPLACE FUNCTION public.assign_server_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  NEW.owner_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_server_owner ON public.servers;
CREATE TRIGGER set_server_owner
  BEFORE INSERT ON public.servers
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_server_owner();

-- Recreate servers insert policy to avoid false-negative checks
DROP POLICY IF EXISTS "Users can create servers" ON public.servers;
CREATE POLICY "Users can create servers"
  ON public.servers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix dm_conversations insert policy (old policy referenced dm_participants incorrectly)
DROP POLICY IF EXISTS "Users can create DM conversations" ON public.dm_conversations;
CREATE POLICY "Users can create DM conversations"
  ON public.dm_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);