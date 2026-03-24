import { useState } from "react";
import { useFriendships, useDmConversations, type DmConversation } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Check, X, MessageSquare, Ban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FriendsViewProps {
  onOpenDm: (conv: DmConversation) => void;
}

export const FriendsView = ({ onOpenDm }: FriendsViewProps) => {
  const { user } = useAuth();
  const { friendships, sendFriendRequest, respondToRequest, blockUser } = useFriendships();
  const { createDm } = useDmConversations();
  const [addUsername, setAddUsername] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "blocked">("all");

  const accepted = friendships.filter((f) => f.status === "accepted");
  const pending = friendships.filter((f) => f.status === "pending");
  const blocked = friendships.filter((f) => f.status === "blocked");
  const incomingPending = pending.filter((f) => f.addressee_id === user?.id);
  const outgoingPending = pending.filter((f) => f.requester_id === user?.id);

  const handleAdd = async () => {
    if (!addUsername.trim()) return;
    try {
      await sendFriendRequest.mutateAsync(addUsername.trim());
      toast.success(`Friend request sent to ${addUsername}!`);
      setAddUsername("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleOpenDm = async (userId: string) => {
    try {
      const convId = await createDm.mutateAsync(userId);
      // We need to construct a minimal DmConversation to pass
      onOpenDm({ id: convId, is_group: false, name: null, created_at: "", participants: [] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const statusColor: Record<string, string> = {
    online: "bg-discord-green",
    idle: "bg-discord-yellow",
    dnd: "bg-discord-red",
    invisible: "bg-discord-grey",
    offline: "bg-discord-grey",
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-12 items-center gap-4 border-b border-border px-4">
        <span className="font-display font-semibold text-foreground">Friends</span>
        <div className="flex gap-1">
          {(["all", "pending", "blocked"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {t}
              {t === "pending" && pending.length > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                  {incomingPending.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Add Friend */}
        <div className="mb-6 rounded-lg bg-card p-4">
          <h3 className="mb-2 font-display text-sm font-bold uppercase text-foreground">Add Friend</h3>
          <p className="mb-3 text-xs text-muted-foreground">Send a friend request by entering a username.</p>
          <div className="flex gap-2">
            <Input
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder="Enter a username"
              className="bg-secondary text-foreground"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={sendFriendRequest.isPending} size="sm">
              <UserPlus className="mr-1 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>

        {tab === "all" && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              All Friends — {accepted.length}
            </h4>
            {accepted.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No friends yet. Add someone above!</p>
            ) : (
              accepted.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={f.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                          {(f.profile?.display_name || f.profile?.username || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${statusColor[f.profile?.status || "offline"]}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.profile?.display_name || f.profile?.username}</p>
                      <p className="text-xs capitalize text-muted-foreground">{f.profile?.status || "offline"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenDm(f.requester_id === user?.id ? f.addressee_id : f.requester_id)}
                      className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "pending" && (
          <div className="space-y-4">
            {incomingPending.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Incoming — {incomingPending.length}</h4>
                {incomingPending.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={f.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                          {(f.profile?.username || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.profile?.display_name || f.profile?.username}</p>
                        <p className="text-xs text-muted-foreground">Incoming request</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => respondToRequest.mutateAsync({ friendshipId: f.id, accept: true })}
                        className="rounded-full bg-discord-green/20 p-2 text-discord-green hover:bg-discord-green/30"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => respondToRequest.mutateAsync({ friendshipId: f.id, accept: false })}
                        className="rounded-full bg-destructive/20 p-2 text-destructive hover:bg-destructive/30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {outgoingPending.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Outgoing — {outgoingPending.length}</h4>
                {outgoingPending.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={f.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                          {(f.profile?.username || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-foreground">{f.profile?.display_name || f.profile?.username}</p>
                    </div>
                    <button
                      onClick={() => respondToRequest.mutateAsync({ friendshipId: f.id, accept: false })}
                      className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {pending.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No pending requests</p>
            )}
          </div>
        )}

        {tab === "blocked" && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Blocked — {blocked.length}</h4>
            {blocked.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No blocked users</p>
            ) : (
              blocked.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-secondary text-xs text-muted-foreground">
                        <Ban className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-foreground">{f.profile?.username || "Blocked user"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
