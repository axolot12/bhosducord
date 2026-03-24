import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export interface DmConversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  participants?: {
    user_id: string;
    profiles?: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      status: string;
    };
  }[];
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  edited_at: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export const useFriendships = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (error) throw error;

      // Fetch profiles for all friends
      const userIds = data.flatMap((f: any) => [f.requester_id, f.addressee_id]).filter((id: string) => id !== user.id);
      const uniqueIds = [...new Set(userIds)];
      if (uniqueIds.length === 0) return data.map((f: any) => ({ ...f, profile: null })) as Friendship[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, status")
        .in("user_id", uniqueIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return data.map((f: any) => ({
        ...f,
        profile: profileMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id),
      })) as Friendship[];
    },
    enabled: !!user,
  });

  const sendFriendRequest = useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error("Not authenticated");
      // Find user by username
      const { data: target, error: findError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .single();
      if (findError) throw new Error("User not found");
      if (target.user_id === user.id) throw new Error("Cannot add yourself");

      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: target.user_id });
      if (error) {
        if (error.code === "23505") throw new Error("Request already sent");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("friendships")
          .delete()
          .eq("id", friendshipId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
  });

  const blockUser = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "blocked" })
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
  });

  return {
    friendships: friendshipsQuery.data || [],
    isLoading: friendshipsQuery.isLoading,
    sendFriendRequest,
    respondToRequest,
    blockUser,
  };
};

export const useDmConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: participantData, error: pError } = await supabase
        .from("dm_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (pError) throw pError;
      if (!participantData.length) return [];

      const convIds = participantData.map((p: any) => p.conversation_id);
      const { data, error } = await supabase
        .from("dm_conversations")
        .select("*")
        .in("id", convIds);
      if (error) throw error;

      // Get all participants for these conversations
      const { data: allParticipants } = await supabase
        .from("dm_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      const otherUserIds = (allParticipants || [])
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => p.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, status")
        .in("user_id", [...new Set(otherUserIds)]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return data.map((conv: any) => ({
        ...conv,
        participants: (allParticipants || [])
          .filter((p: any) => p.conversation_id === conv.id && p.user_id !== user.id)
          .map((p: any) => ({ user_id: p.user_id, profiles: profileMap.get(p.user_id) })),
      })) as DmConversation[];
    },
    enabled: !!user,
  });

  const createDm = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Check existing conversation
      const { data: myConvs } = await supabase
        .from("dm_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvs && myConvs.length > 0) {
        const { data: theirConvs } = await supabase
          .from("dm_participants")
          .select("conversation_id")
          .eq("user_id", targetUserId)
          .in("conversation_id", myConvs.map((c: any) => c.conversation_id));

        if (theirConvs && theirConvs.length > 0) {
          // Check if it's a non-group DM
          const { data: existing } = await supabase
            .from("dm_conversations")
            .select("*")
            .eq("is_group", false)
            .in("id", theirConvs.map((c: any) => c.conversation_id))
            .limit(1);
          if (existing && existing.length > 0) return existing[0].id;
        }
      }

      // Create new
      const { data: conv, error: convError } = await supabase
        .from("dm_conversations")
        .insert({ is_group: false })
        .select()
        .single();
      if (convError) throw convError;

      // Add participants
      const { error: p1Error } = await supabase
        .from("dm_participants")
        .insert({ conversation_id: conv.id, user_id: user.id });
      if (p1Error) throw p1Error;

      const { error: p2Error } = await supabase
        .from("dm_participants")
        .insert({ conversation_id: conv.id, user_id: targetUserId });
      if (p2Error) throw p2Error;

      return conv.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
  });

  return { conversations: conversationsQuery.data || [], isLoading: conversationsQuery.isLoading, createDm };
};

export const useDmMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["dm-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;

      const authorIds = [...new Set((data || []).map((m: any) => m.author_id))];
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from("profiles").select("user_id, username, display_name, avatar_url, status").in("user_id", authorIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.author_id) || null,
      })) as DmMessage[];
    },
    enabled: !!conversationId,
  });

  const subscribeToDmMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dm-messages", conversationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  return { messages: messagesQuery.data || [], isLoading: messagesQuery.isLoading, subscribeToDmMessages };
};

export const useSendDmMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("dm_messages")
        .insert({ conversation_id: conversationId, author_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["dm-messages", conversationId] });
    },
  });
};
