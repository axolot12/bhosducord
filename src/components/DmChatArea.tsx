import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Headphones, HeadphoneOff, Signal, ChevronUp, ChevronDown } from "lucide-react";
import { useDmMessages, useSendDmMessage, type DmConversation } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { MessageActions, ReactionDisplay } from "@/components/MessageActions";
import { InviteEmbed, parseMessageContent } from "@/components/InviteEmbed";
import { MentionInput } from "@/components/MentionInput";

interface DmChatAreaProps {
  conversation: DmConversation | null;
  onStartVoiceCall?: () => void;
}

const BASE_URL = window.location.origin;

export const DmChatArea = ({ conversation }: DmChatAreaProps) => {
  const convId = conversation?.id || null;
  const { messages, isLoading, subscribeToDmMessages } = useDmMessages(convId);
  const sendMessage = useSendDmMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { profile } = useProfile();

  const otherUser = conversation?.participants?.[0]?.profiles;
  const displayName = otherUser?.display_name || otherUser?.username || "User";

  // Call state
  const [inCall, setInCall] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callDeafened, setCallDeafened] = useState(false);
  const [callPanelHeight, setCallPanelHeight] = useState(200);
  const resizingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (convId) {
      const unsub = subscribeToDmMessages(convId);
      return unsub;
    }
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup mic on unmount or call end
  useEffect(() => {
    if (!inCall) {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    return () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    };
  }, [inCall]);

  const handleSend = async (content: string) => {
    if (!convId) return;
    try {
      await sendMessage.mutateAsync({ conversationId: convId, content });
    } catch {}
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setInCall(true);
      // Send call notification as a message
      handleSend(`📞 ${profile?.display_name || profile?.username || "User"} started a voice call — ${format(new Date(), "h:mm a")}`);
    } catch {
      // ignore
    }
  };

  const endCall = () => {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    setInCall(false);
    setCallMuted(false);
    setCallDeafened(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startY = e.clientY;
    const startHeight = callPanelHeight;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = startY - ev.clientY;
      setCallPanelHeight(Math.max(120, Math.min(400, startHeight + diff)));
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Build DM participants for mentions
  const dmParticipants = conversation?.participants?.map(p => ({
    user_id: p.user_id,
    display_name: p.profiles?.display_name,
    username: p.profiles?.username,
    avatar_url: p.profiles?.avatar_url,
  })) || [];

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
          {!inCall ? (
            <button
              onClick={startCall}
              className="rounded p-1.5 text-muted-foreground hover:text-foreground"
              title="Voice Call"
            >
              <Phone className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={endCall}
              className="rounded p-1.5 text-destructive hover:text-destructive/80"
              title="End Call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Call panel (inline, resizable) */}
      {inCall && (
        <div style={{ height: callPanelHeight }} className="flex flex-col border-b border-border bg-discord-darker">
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="flex h-3 cursor-row-resize items-center justify-center hover:bg-muted/50"
          >
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Signal className="h-4 w-4 text-discord-green" />
              <span className="text-sm font-semibold text-discord-green">Voice Connected</span>
            </div>
            <p className="text-xs text-muted-foreground">Call with {displayName}</p>
            <Avatar className="h-16 w-16">
              <AvatarImage src={otherUser?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCallMuted(!callMuted);
                  if (micStreamRef.current) {
                    micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = callMuted));
                  }
                }}
                className={`rounded-full p-2.5 transition-colors ${
                  callMuted ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                {callMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setCallDeafened(!callDeafened);
                  if (!callDeafened) setCallMuted(true);
                }}
                className={`rounded-full p-2.5 transition-colors ${
                  callDeafened ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                {callDeafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
              </button>
              <button
                onClick={endCall}
                className="rounded-full bg-destructive p-2.5 text-destructive-foreground hover:bg-destructive/80"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
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
            const msgProfile = msg.profiles;
            const name = msgProfile?.display_name || msgProfile?.username || "Unknown";
            const parts = parseMessageContent(msg.content, BASE_URL);
            return (
              <div key={msg.id} className="group relative flex gap-3 px-4 py-1 hover:bg-muted/30">
                <Avatar className="mt-0.5 h-10 w-10 flex-shrink-0">
                  <AvatarImage src={msgProfile?.avatar_url || ""} />
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

      {/* Mention-enabled Input with file upload */}
      <MentionInput
        channelName={displayName}
        onSend={handleSend}
        placeholder={`Message @${displayName}`}
        dmParticipants={dmParticipants}
      />
    </div>
  );
};
