
-- Add banner_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text DEFAULT NULL;

-- Enable realtime for messages and dm_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- Add unique constraint on server invite codes for lookups
CREATE UNIQUE INDEX IF NOT EXISTS servers_invite_code_unique ON public.servers (invite_code) WHERE invite_code IS NOT NULL;
