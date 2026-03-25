import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface InviteEmbedProps {
  inviteCode: string;
}

export const InviteEmbed = ({ inviteCode }: InviteEmbedProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .rpc("get_invite_server", { _invite_code: inviteCode })
        .single();
      setServer(data || null);
      setLoading(false);
    };
    fetch();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!server) return;
    if (!user) {
      toast.error("Please log in to join this server");
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabase.rpc("join_server_by_invite", { _invite_code: inviteCode });
      if (error?.message?.toLowerCase().includes("already")) toast.info("Already a member!");
      else if (error) throw error;
      else toast.success(`Joined ${server.name}!`);
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setJoining(false);
    }
  };
...
export const parseMessageContent = (content: string, baseUrl: string) => {
  const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inviteRegex = new RegExp(`(?:${escapedBase}(?:/\\#)?|\\#)?/invite/([a-zA-Z0-9]+)`, "g");
  const parts: { type: "text" | "invite"; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = inviteRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "invite", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value: content }];
};
