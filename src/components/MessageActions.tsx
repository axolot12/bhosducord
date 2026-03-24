import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Pin, Reply, Smile, MoreHorizontal, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👎", "💯", "✅"];

interface MessageActionsProps {
  messageId: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  channelId?: string;
  conversationId?: string;
  isDm?: boolean;
  onReply?: (messageId: string) => void;
}

export const MessageActions = ({
  messageId, authorId, content, isPinned, channelId, conversationId, isDm, onReply
}: MessageActionsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isAuthor = user?.id === authorId;

  const handleDelete = async () => {
    const table = isDm ? "dm_messages" : "messages";
    const { error } = await supabase.from(table).delete().eq("id", messageId);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: [isDm ? "dm-messages" : "messages"] });
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    const table = isDm ? "dm_messages" : "messages";
    const { error } = await supabase
      .from(table)
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq("id", messageId);
    if (error) toast.error("Failed to edit");
    else {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: [isDm ? "dm-messages" : "messages"] });
    }
  };

  const handlePin = async () => {
    if (isDm) return;
    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: !isPinned })
      .eq("id", messageId);
    if (error) toast.error("Failed to pin");
    else {
      toast.success(isPinned ? "Unpinned" : "Pinned!");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    const field = isDm ? "dm_message_id" : "message_id";
    // Toggle reaction
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq(field, messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({
        [field]: messageId,
        user_id: user.id,
        emoji,
      });
    }
    setShowEmojiPicker(false);
    queryClient.invalidateQueries({ queryKey: [isDm ? "dm-messages" : "messages"] });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied!");
  };

  if (editing) {
    return (
      <div className="mt-1 flex gap-2">
        <input
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 rounded-md bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
        <button onClick={handleEdit} className="text-xs text-primary hover:underline">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
      </div>
    );
  }

  return (
    <>
      {/* Hover toolbar */}
      <div className="absolute -top-3 right-2 hidden rounded-md border border-border bg-card shadow-lg group-hover:flex">
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-muted-foreground hover:text-foreground" title="React">
          <Smile className="h-4 w-4" />
        </button>
        {onReply && (
          <button onClick={() => onReply(messageId)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Reply">
            <Reply className="h-4 w-4" />
          </button>
        )}
        <button onClick={handleCopy} className="p-1.5 text-muted-foreground hover:text-foreground" title="Copy">
          <Copy className="h-4 w-4" />
        </button>
        {!isDm && (
          <button onClick={handlePin} className="p-1.5 text-muted-foreground hover:text-foreground" title={isPinned ? "Unpin" : "Pin"}>
            <Pin className="h-4 w-4" />
          </button>
        )}
        {isAuthor && (
          <>
            <button onClick={() => { setEditing(true); setEditContent(content); }} className="p-1.5 text-muted-foreground hover:text-foreground" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={handleDelete} className="p-1.5 text-muted-foreground hover:text-destructive" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div className="absolute -top-12 right-2 z-50 flex gap-1 rounded-lg border border-border bg-card p-2 shadow-xl">
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="rounded p-1 text-lg hover:bg-muted/50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

interface ReactionDisplayProps {
  messageId: string;
  isDm?: boolean;
}

export const ReactionDisplay = ({ messageId, isDm }: ReactionDisplayProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reactions, setReactions] = useState<{ emoji: string; count: number; userReacted: boolean }[]>([]);

  useEffect(() => {
    const fetchReactions = async () => {
      const field = isDm ? "dm_message_id" : "message_id";
      const { data } = await supabase
        .from("reactions")
        .select("emoji, user_id")
        .eq(field, messageId);

      if (!data || data.length === 0) {
        setReactions([]);
        return;
      }

      const grouped: Record<string, { count: number; userReacted: boolean }> = {};
      data.forEach((r: any) => {
        if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userReacted: false };
        grouped[r.emoji].count++;
        if (r.user_id === user?.id) grouped[r.emoji].userReacted = true;
      });

      setReactions(Object.entries(grouped).map(([emoji, val]) => ({ emoji, ...val })));
    };
    fetchReactions();
  }, [messageId, isDm, user?.id]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const field = isDm ? "dm_message_id" : "message_id";
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq(field, messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ [field]: messageId, user_id: user.id, emoji });
    }
    // Refetch
    const { data } = await supabase.from("reactions").select("emoji, user_id").eq(field, messageId);
    if (!data) { setReactions([]); return; }
    const grouped: Record<string, { count: number; userReacted: boolean }> = {};
    data.forEach((r: any) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userReacted: false };
      grouped[r.emoji].count++;
      if (r.user_id === user?.id) grouped[r.emoji].userReacted = true;
    });
    setReactions(Object.entries(grouped).map(([emoji, val]) => ({ emoji, ...val })));
  };

  if (reactions.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
            r.userReacted
              ? "border border-primary/50 bg-primary/10 text-primary"
              : "border border-border bg-secondary text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
};
