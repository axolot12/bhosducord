
-- Servers table
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Server members table
CREATE TABLE public.server_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);

-- Channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice', 'announcement')),
  category TEXT DEFAULT 'Text Channels',
  position INTEGER NOT NULL DEFAULT 0,
  slow_mode_interval INTEGER NOT NULL DEFAULT 0,
  is_nsfw BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Friends table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- DM conversations table
CREATE TABLE public.dm_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- DM participants
CREATE TABLE public.dm_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- DM messages
CREATE TABLE public.dm_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message reactions
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  dm_message_id UUID REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (message_id IS NOT NULL OR dm_message_id IS NOT NULL)
);

-- Enable RLS on all tables
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS: Servers - viewable by members
CREATE POLICY "Servers viewable by members" ON public.servers FOR SELECT TO authenticated
  USING (id IN (SELECT server_id FROM public.server_members WHERE user_id = auth.uid()) OR is_public = true);

CREATE POLICY "Users can create servers" ON public.servers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Server owners can update" ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Server owners can delete" ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS: Server members
CREATE POLICY "Members viewable by server members" ON public.server_members FOR SELECT TO authenticated
  USING (server_id IN (SELECT server_id FROM public.server_members sm WHERE sm.user_id = auth.uid()));

CREATE POLICY "Users can join servers" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave servers" ON public.server_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: Channels - viewable by server members
CREATE POLICY "Channels viewable by server members" ON public.channels FOR SELECT TO authenticated
  USING (server_id IN (SELECT server_id FROM public.server_members WHERE user_id = auth.uid()));

CREATE POLICY "Server owners can manage channels" ON public.channels FOR INSERT TO authenticated
  WITH CHECK (server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid()));

CREATE POLICY "Server owners can update channels" ON public.channels FOR UPDATE TO authenticated
  USING (server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid()));

CREATE POLICY "Server owners can delete channels" ON public.channels FOR DELETE TO authenticated
  USING (server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid()));

-- RLS: Messages - viewable by server members
CREATE POLICY "Messages viewable by server members" ON public.messages FOR SELECT TO authenticated
  USING (channel_id IN (SELECT c.id FROM public.channels c JOIN public.server_members sm ON c.server_id = sm.server_id WHERE sm.user_id = auth.uid()));

CREATE POLICY "Members can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND channel_id IN (SELECT c.id FROM public.channels c JOIN public.server_members sm ON c.server_id = sm.server_id WHERE sm.user_id = auth.uid()));

CREATE POLICY "Authors can edit messages" ON public.messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete messages" ON public.messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- RLS: Friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- RLS: DM conversations - viewable by participants
CREATE POLICY "DM conversations viewable by participants" ON public.dm_conversations FOR SELECT TO authenticated
  USING (id IN (SELECT conversation_id FROM public.dm_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can create DM conversations" ON public.dm_conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS: DM participants
CREATE POLICY "DM participants viewable by conversation members" ON public.dm_participants FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT conversation_id FROM public.dm_participants dp WHERE dp.user_id = auth.uid()));

CREATE POLICY "Users can add DM participants" ON public.dm_participants FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS: DM messages
CREATE POLICY "DM messages viewable by participants" ON public.dm_messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT conversation_id FROM public.dm_participants WHERE user_id = auth.uid()));

CREATE POLICY "Participants can send DM messages" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND conversation_id IN (SELECT conversation_id FROM public.dm_participants WHERE user_id = auth.uid()));

CREATE POLICY "Authors can edit DM messages" ON public.dm_messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete DM messages" ON public.dm_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- RLS: Reactions
CREATE POLICY "Reactions viewable by message viewers" ON public.reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions" ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions" ON public.reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- Auto-create server member + default channel on server creation
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add owner as member
  INSERT INTO public.server_members (server_id, user_id) VALUES (NEW.id, NEW.owner_id);
  -- Create default channels
  INSERT INTO public.channels (server_id, name, category, position, type) VALUES
    (NEW.id, 'general', 'Text Channels', 0, 'text'),
    (NEW.id, 'announcements', 'Text Channels', 1, 'text'),
    (NEW.id, 'General', 'Voice Channels', 0, 'voice');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server();

-- Trigger to attach handle_new_user to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
