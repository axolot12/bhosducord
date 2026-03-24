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
        .from("servers")
        .select("id, name, icon_url, description, member_count")
        .eq("invite_code", inviteCode)
        .single();
      setServer(data);
      setLoading(false);
    };
    fetch();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!user || !server) return;
    setJoining(true);
    try {
      const { error } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });
      if (error?.code === "23505") toast.info("Already a member!");
      else if (error) throw error;
      else toast.success(`Joined ${server.name}!`);
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="my-1 h-16 w-64 animate-pulse rounded-lg bg-secondary" />;
  if (!server) return null;

  return (
    <div className="my-1 inline-flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Avatar className="h-10 w-10 flex-shrink-0">
        {server.icon_url ? <AvatarImage src={server.icon_url} /> : null}
        <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
          {server.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{server.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" /> {server.member_count} members
        </p>
      </div>
      <Button size="sm" onClick={handleJoin} disabled={joining} className="flex-shrink-0">
        {joining ? "..." : "Join"}
      </Button>
    </div>
  );
};

// Utility to detect invite links in message content
export const parseMessageContent = (content: string, baseUrl: string) => {
  // Match invite links like https://domain.com/invite/CODE or just invite codes
  const inviteRegex = new RegExp(`(?:${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?/invite/([a-zA-Z0-9]+)`, 'g');
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
