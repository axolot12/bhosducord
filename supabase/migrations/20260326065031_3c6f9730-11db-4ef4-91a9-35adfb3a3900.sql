
-- Fix handle_new_server to avoid duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add owner as member (ignore if already exists)
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT (server_id, user_id) DO NOTHING;
  
  -- Create default channels
  INSERT INTO public.channels (server_id, name, category, position, type)
  VALUES
    (NEW.id, 'general', 'Text Channels', 0, 'text'),
    (NEW.id, 'announcements', 'Text Channels', 1, 'text'),
    (NEW.id, 'General', 'Voice Channels', 0, 'voice');
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trg_handle_new_server ON public.servers;
CREATE TRIGGER trg_handle_new_server
AFTER INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_server();

-- Ensure member count trigger exists
DROP TRIGGER IF EXISTS trg_sync_server_member_count ON public.server_members;
CREATE TRIGGER trg_sync_server_member_count
AFTER INSERT OR DELETE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_server_member_count();

-- Ensure profile trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
