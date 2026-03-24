import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  description: string;
  is_public: boolean;
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  topic: string;
  type: string;
  category: string;
  position: number;
  slow_mode_interval: number;
  is_nsfw: boolean;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited_at: string | null;
  is_pinned: boolean;
  reply_to_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export const useServers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const serversQuery = useQuery({
    queryKey: ["servers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Server[];
    },
    enabled: !!user,
  });

  const createServer = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("servers")
        .insert({ name, description: description || "", owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Server;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });

  const joinServer = useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error("Not authenticated");
      // Find server by invite code
      const { data: server, error: findError } = await supabase
        .from("servers")
        .select("id")
        .eq("invite_code", inviteCode)
        .single();
      if (findError) throw new Error("Invalid invite code");
      // Join
      const { error } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });
      if (error) {
        if (error.code === "23505") throw new Error("Already a member");
        throw error;
      }
      return server.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });

  return { servers: serversQuery.data || [], isLoading: serversQuery.isLoading, createServer, joinServer };
};

export const useChannels = (serverId: string | null) => {
  return useQuery({
    queryKey: ["channels", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!serverId,
  });
};

export const useMessages = (channelId: string | null) => {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles!messages_author_id_fkey(username, display_name, avatar_url, status)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!channelId,
  });

  // Subscribe to realtime
  const subscribeToMessages = (channelId: string) => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { messages: messagesQuery.data || [], isLoading: messagesQuery.isLoading, subscribeToMessages };
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("messages")
        .insert({ channel_id: channelId, author_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });
};

export const useServerMembers = (serverId: string | null) => {
  return useQuery({
    queryKey: ["server-members", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const { data, error } = await supabase
        .from("server_members")
        .select("*, profiles!server_members_user_id_fkey(username, display_name, avatar_url, status)")
        .eq("server_id", serverId);
      if (error) throw error;
      return data;
    },
    enabled: !!serverId,
  });
};
