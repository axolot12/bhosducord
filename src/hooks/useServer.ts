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

      const { data, error } = await supabase.rpc("join_server_by_invite", {
        _invite_code: inviteCode,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("invalid invite")) {
          throw new Error("Invalid invite code");
        }
        throw error;
      }

      return data as string;
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
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map((m: any) => m.author_id))];
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from("profiles").select("user_id, username, display_name, avatar_url, status").in("user_id", authorIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.author_id) || null,
      })) as Message[];
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
        .select("*")
        .eq("server_id", serverId);
      if (error) throw error;

      const userIds = (data || []).map((m: any) => m.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, username, display_name, avatar_url, status").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.user_id) || null,
      }));
    },
    enabled: !!serverId,
  });
};
