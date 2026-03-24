import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Plus, Send } from "lucide-react";
import { useMessages, useSendMessage, type Message } from "@/hooks/useServer";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface ChatAreaProps {
  channelId: string | null;
  channelName: string;
}

const MessageItem = ({ msg }: { msg: Message }) => {
  const profile = msg.profiles;
  const name = profile?.display_name || profile?.username || "Unknown";
  const initial = name[0]?.toUpperCase() || "?";

  return (
    <div className="group flex gap-3 px-4 py-1 hover:bg-muted/30">
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
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{msg.content}</p>
      </div>
    </div>
  );
};

export const ChatArea = ({ channelId, channelName }: ChatAreaProps) => {
  const { messages, isLoading, subscribeToMessages } = useMessages(channelId);
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

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
      <div className="flex h-12 items-center gap-2 border-b border-border px-4 shadow-sm">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <span className="font-display font-semibold text-foreground">{channelName}</span>
      </div>

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
          messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
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
