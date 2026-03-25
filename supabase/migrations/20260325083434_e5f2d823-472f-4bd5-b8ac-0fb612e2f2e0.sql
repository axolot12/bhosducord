-- Ensure owner can always see own servers even before membership rows exist
DROP POLICY IF EXISTS "Servers viewable by members" ON public.servers;
CREATE POLICY "Servers viewable by members"
ON public.servers
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_public = true
  OR id IN (
    SELECT sm.server_id
    FROM public.server_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- Ensure profiles are unique per auth user for reliable upsert/backfill
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx
ON public.profiles (user_id);

-- Recreate server triggers that were missing
DROP TRIGGER IF EXISTS set_server_owner ON public.servers;
CREATE TRIGGER set_server_owner
BEFORE INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.assign_server_owner();

DROP TRIGGER IF EXISTS on_server_created ON public.servers;
CREATE TRIGGER on_server_created
AFTER INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_server();

-- Keep profile updated_at accurate
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();