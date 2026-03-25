import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Plus, Send, Pin, Users } from "lucide-react";
import { useMessages, useSendMessage, type Message } from "@/hooks/useServer";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MessageActions, ReactionDisplay } from "@/components/MessageActions";
import { InviteEmbed, parseMessageContent } from "@/components/InviteEmbed";

interface ChatAreaProps {
  channelId: string | null;
  channelName: string;
  showMembersToggle?: boolean;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

const BASE_URL = window.location.origin;

const MessageContent = ({ content }: { content: string }) => {
  const parts = parseMessageContent(content, BASE_URL);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "invite" ? (
          <InviteEmbed key={i} inviteCode={part.value} />
        ) : (
          <span key={i} className="whitespace-pre-wrap break-words text-sm text-foreground/90">
            {part.value}
          </span>
        )
      )}
    </div>
  );
};

const MessageItem = ({ msg, onReply }: { msg: Message; onReply: (id: string) => void }) => {
  const profile = msg.profiles;
  const name = profile?.display_name || profile?.username || "Unknown";
  const initial = name[0]?.toUpperCase() || "?";

  return (
    <div className="group relative flex gap-3 px-4 py-1 hover:bg-muted/30">
      <Avatar className="mt-0.5 h-10 w-10 flex-shrink-0">
        <AvatarImage src={profile?.avatar_url || ""} />
        <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(msg.created_at), "MM/dd/yyyy h:mm a")}
          </span>
          {msg.is_pinned && <Pin className="h-3 w-3 text-discord-yellow" />}
          {msg.edited_at && <span className="text-[10px] text-muted-foreground">(edited)</span>}
        </div>
        <MessageContent content={msg.content} />
        <ReactionDisplay messageId={msg.id} />
      </div>
      <MessageActions
        messageId={msg.id}
        authorId={msg.author_id}
        content={msg.content}
        isPinned={msg.is_pinned}
        channelId={msg.channel_id}
        onReply={onReply}
      />
    </div>
  );
};

export const ChatArea = ({ channelId, channelName, showMembersToggle, showMembers, onToggleMembers }: ChatAreaProps) => {
  const { messages, isLoading, subscribeToMessages } = useMessages(channelId);
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [showPinned, setShowPinned] = useState(false);

  const pinnedMessages = messages.filter(m => m.is_pinned);

  useEffect(() => {
    if (channelId) {
      const unsubscribe = subscribeToMessages(channelId);
      return unsubscribe;
    }
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !channelId) return;
    const content = input.trim();
    setInput("");
    setReplyTo(null);
    try {
      await sendMessage.mutateAsync({ channelId, content });
    } catch {
      setInput(content);
    }
  };

  if (!channelId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Channel Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <span className="font-display font-semibold text-foreground">{channelName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPinned(!showPinned)}
            className={`rounded p-1.5 transition-colors ${showPinned ? "text-discord-yellow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Pin className="h-4 w-4" />
          </button>
          {showMembersToggle && onToggleMembers && (
            <button
              onClick={onToggleMembers}
              className={`rounded p-1.5 transition-colors ${showMembers ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pinned sidebar */}
      {showPinned && (
        <div className="border-b border-border bg-card p-3">
          <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
            Pinned Messages — {pinnedMessages.length}
          </h4>
          {pinnedMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pinned messages</p>
          ) : (
            pinnedMessages.map(m => (
              <div key={m.id} className="mb-1 rounded bg-secondary/50 p-2 text-sm text-foreground">
                <span className="font-semibold">{m.profiles?.display_name || m.profiles?.username}: </span>
                {m.content}
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Hash className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Welcome to #{channelName}
            </h2>
            <p className="mt-1 text-muted-foreground">
              This is the beginning of the #{channelName} channel.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} onReply={(id) => setReplyTo(id)} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
          <span>Replying to a message</span>
          <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">Cancel</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4">
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5">
          <button type="button" className="text-muted-foreground hover:text-foreground">
            <Plus className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {input.trim() && (
            <button type="submit" className="text-primary hover:text-primary/80">
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
