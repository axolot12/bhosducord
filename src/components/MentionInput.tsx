import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useServerMembers } from "@/hooks/useServer";
import { Send, Plus } from "lucide-react";

interface MentionInputProps {
  serverId?: string | null;
  channelName: string;
  onSend: (content: string) => void;
  placeholder?: string;
}

export const MentionInput = ({ serverId, channelName, onSend, placeholder }: MentionInputProps) => {
  const [input, setInput] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: members } = useServerMembers(serverId || null);

  const filteredMembers = mentionQuery !== null
    ? (members || [])
        .filter((m: any) => {
          const name = (m.profiles?.display_name || m.profiles?.username || "").toLowerCase();
          return name.includes(mentionQuery.toLowerCase());
        })
        .slice(0, 5)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(val);
    setCursorPos(pos);

    // Check if we're in an @mention context
    const textBeforeCursor = val.slice(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (member: any) => {
    const name = member.profiles?.display_name || member.profiles?.username || "User";
    const textBeforeCursor = input.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const before = input.slice(0, atIndex);
    const after = input.slice(cursorPos);
    const newVal = `${before}@${name} ${after}`;
    setInput(newVal);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && mentionQuery === null) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input.trim());
        setInput("");
      }
    }
  };

  return (
    <div className="relative p-4">
      {/* Mention dropdown */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
          {filteredMembers.map((m: any, i: number) => {
            const name = m.profiles?.display_name || m.profiles?.username || "User";
            return (
              <button
                key={m.id}
                onClick={() => insertMention(m)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  i === mentionIndex ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={m.profiles?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-[8px] text-primary-foreground">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.profiles?.username}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5">
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <Plus className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Message #${channelName}`}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {input.trim() && (
          <button
            onClick={() => {
              if (input.trim()) {
                onSend(input.trim());
                setInput("");
              }
            }}
            className="text-primary hover:text-primary/80"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};
