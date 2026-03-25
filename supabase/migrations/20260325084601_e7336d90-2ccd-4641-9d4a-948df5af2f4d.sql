
-- Recreate the handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Recreate server triggers
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

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (user_id, username, display_name)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
