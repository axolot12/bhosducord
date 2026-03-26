import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Plus, Phone, Video } from "lucide-react";
import { useDmMessages, useSendDmMessage, type DmConversation } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MessageActions, ReactionDisplay } from "@/components/MessageActions";
import { InviteEmbed, parseMessageContent } from "@/components/InviteEmbed";

interface DmChatAreaProps {
  conversation: DmConversation | null;
  onStartVoiceCall?: () => void;
}

const BASE_URL = window.location.origin;

export const DmChatArea = ({ conversation, onStartVoiceCall }: DmChatAreaProps) => {
  const convId = conversation?.id || null;
  const { messages, isLoading, subscribeToDmMessages } = useDmMessages(convId);
  const sendMessage = useSendDmMessage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = conversation?.participants?.[0]?.profiles;
  const displayName = otherUser?.display_name || otherUser?.username || "User";

  useEffect(() => {
    if (convId) {
      const unsub = subscribeToDmMessages(convId);
      return unsub;
    }
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !convId) return;
    const content = input.trim();
    setInput("");
    try {
      await sendMessage.mutateAsync({ conversationId: convId, content });
    } catch {
      setInput(content);
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={otherUser?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-display font-semibold text-foreground">{displayName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onStartVoiceCall}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground"
            title="Voice Call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={onStartVoiceCall}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground"
            title="Video Call"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Avatar className="mb-4 h-16 w-16">
              <AvatarImage src={otherUser?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-display text-xl font-bold text-foreground">{displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the beginning of your conversation with {displayName}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const profile = msg.profiles;
            const name = profile?.display_name || profile?.username || "Unknown";
            const parts = parseMessageContent(msg.content, BASE_URL);
            return (
              <div key={msg.id} className="group relative flex gap-3 px-4 py-1 hover:bg-muted/30">
                <Avatar className="mt-0.5 h-10 w-10 flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm font-semibold text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), "MM/dd/yyyy h:mm a")}
                    </span>
                    {msg.edited_at && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                  </div>
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
                  <ReactionDisplay messageId={msg.id} isDm />
                </div>
                <MessageActions
                  messageId={msg.id}
                  authorId={msg.author_id}
                  content={msg.content}
                  isPinned={false}
                  conversationId={msg.conversation_id}
                  isDm
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

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
            placeholder={`Message @${displayName}`}
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
