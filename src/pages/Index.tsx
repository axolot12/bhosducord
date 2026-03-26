import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useServers, useChannels, useServerMembers, type Server, type Channel } from "@/hooks/useServer";
import { useDmConversations, useFriendships, type DmConversation } from "@/hooks/useFriends";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hash, Volume2, Settings, Plus, ChevronDown, Users, Compass, Copy,
  Crown, LogOut, Trash2, Link, CheckCheck, UserPlus, MessageSquare
} from "lucide-react";
import { UserProfilePopup, StatusChanger } from "@/components/UserProfilePopup";
import { CreateServerDialog } from "@/components/ServerDialog";
import { ChatArea } from "@/components/ChatArea";
import { DmChatArea } from "@/components/DmChatArea";
import { FriendsView } from "@/components/FriendsView";
import { VoiceControls, VoiceChannelView } from "@/components/VoiceChannel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator
} from "@/components/ui/context-menu";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

type View = "server" | "friends" | "dm" | "voice";

const Index = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { servers, isLoading: serversLoading } = useServers();
  const { conversations, createDm } = useDmConversations();
  const { sendFriendRequest } = useFriendships();
  const navigate = useNavigate();

  const [view, setView] = useState<View>("friends");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDm, setSelectedDm] = useState<DmConversation | null>(null);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<{ id: string; name: string; type: "server" | "dm" } | null>(null);
  const [showMembers, setShowMembers] = useState(true);

  const { data: channels } = useChannels(selectedServerId);
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const textChannels = (channels || []).filter((c) => c.type === "text" || c.type === "announcement");
  const voiceChannels = (channels || []).filter((c) => c.type === "voice");
  const selectedChannel = (channels || []).find((c) => c.id === selectedChannelId);

  const isOwner = selectedServer?.owner_id === user?.id;

  useEffect(() => {
    if (textChannels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(textChannels[0].id);
    }
  }, [channels]);

  const handleSelectServer = (server: Server) => {
    setView("server");
    setSelectedServerId(server.id);
    setSelectedChannelId(null);
    setSelectedDm(null);
  };

  const handleHome = () => {
    setView("friends");
    setSelectedServerId(null);
    setSelectedChannelId(null);
    setSelectedDm(null);
  };

  const handleOpenDm = (conv: DmConversation) => {
    setView("dm");
    setSelectedDm(conv);
    setSelectedServerId(null);
    setSelectedChannelId(null);
  };

  const handleJoinVoice = (ch: Channel) => {
    setVoiceChannel({ id: ch.id, name: ch.name, type: "server" });
    setView("voice");
  };

  const handleStartDmCall = () => {
    if (!selectedDm) return;
    const other = selectedDm.participants?.[0]?.profiles;
    const targetName = other?.display_name || other?.username || "User";
    setVoiceChannel({ id: selectedDm.id, name: `Call with ${targetName}`, type: "dm" });
    setView("voice");
  };

  const handleOpenMemberDm = async (targetUserId: string, targetProfile?: { username?: string; display_name?: string | null; avatar_url?: string | null; status?: string }) => {
    try {
      const convId = await createDm.mutateAsync(targetUserId);
      const existing = conversations.find((c) => c.id === convId);

      setView("dm");
      setSelectedServerId(null);
      setSelectedChannelId(null);
      setSelectedDm(
        existing || {
          id: convId,
          is_group: false,
          name: null,
          created_at: new Date().toISOString(),
          participants: [
            {
              user_id: targetUserId,
              profiles: targetProfile
                ? {
                    username: targetProfile.username || "user",
                    display_name: targetProfile.display_name || null,
                    avatar_url: targetProfile.avatar_url || null,
                    status: targetProfile.status || "offline",
                  }
                : undefined,
            },
          ],
        }
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to open DM");
    }
  };

  const handleSendFriendRequestFromMember = async (username: string) => {
    try {
      await sendFriendRequest.mutateAsync(username);
      toast.success(`Friend request sent to ${username}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send friend request");
    }
  };

  const handleCopyInvite = (code: string) => {
    const url = `${window.location.origin}/#/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const handleLeaveServer = async (serverId: string) => {
    if (!user) return;
    const { error } = await supabase.from("server_members").delete()
      .eq("server_id", serverId).eq("user_id", user.id);
    if (error) toast.error("Failed to leave server");
    else {
      toast.success("Left server");
      handleHome();
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    const { error } = await supabase.from("servers").delete().eq("id", serverId);
    if (error) toast.error("Failed to delete server");
    else {
      toast.success("Server deleted");
      handleHome();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const statusColor: Record<string, string> = {
    online: "bg-discord-green",
    idle: "bg-discord-yellow",
    dnd: "bg-discord-red",
    invisible: "bg-discord-grey",
    offline: "bg-discord-grey",
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Server List */}
      <div className="flex w-[72px] flex-shrink-0 flex-col items-center gap-2 overflow-y-auto bg-discord-darker py-3">
        <button
          onClick={handleHome}
          className={`group relative flex h-12 w-12 items-center justify-center transition-all ${
            view === "friends" || view === "dm" ? "rounded-xl bg-primary" : "rounded-2xl bg-secondary hover:rounded-xl hover:bg-primary"
          }`}
        >
          <img src={logoImg} alt="Home" className="h-7 w-7" width={28} height={28} />
        </button>
        <div className="mx-auto h-0.5 w-8 rounded-full bg-border" />

        {servers.map((server) => (
          <ContextMenu key={server.id}>
            <ContextMenuTrigger>
              <button
                onClick={() => handleSelectServer(server)}
                title={server.name}
                className={`group relative flex h-12 w-12 items-center justify-center font-display text-sm font-bold transition-all ${
                  selectedServerId === server.id
                    ? "rounded-xl bg-primary text-primary-foreground"
                    : "rounded-[24px] bg-secondary text-secondary-foreground hover:rounded-xl hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {server.icon_url ? (
                  <img src={server.icon_url} alt={server.name} className="h-full w-full rounded-inherit object-cover" />
                ) : (
                  server.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                )}
                {selectedServerId === server.id && (
                  <div className="absolute -left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-foreground" />
                )}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52 border-border bg-card">
              <ContextMenuItem onClick={() => toast.success("Marked as read")}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark As Read
              </ContextMenuItem>
              {server.invite_code && (
                <ContextMenuItem onClick={() => handleCopyInvite(server.invite_code)}>
                  <Link className="mr-2 h-4 w-4" /> Copy Invite Link
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              {server.owner_id === user?.id ? (
                <ContextMenuItem onClick={() => handleDeleteServer(server.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Server
                </ContextMenuItem>
              ) : (
                <ContextMenuItem onClick={() => handleLeaveServer(server.id)} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Leave Server
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}

        <button
          onClick={() => setShowServerDialog(true)}
          className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-secondary text-discord-green transition-all hover:rounded-xl hover:bg-discord-green hover:text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate("/discovery")}
          className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-secondary text-discord-green transition-all hover:rounded-xl hover:bg-discord-green hover:text-primary-foreground"
        >
          <Compass className="h-5 w-5" />
        </button>
      </div>

      {/* Channel/DM Sidebar */}
      <div className="flex w-60 flex-shrink-0 flex-col bg-discord-dark">
        {view === "server" || view === "voice" ? (
          selectedServer ? (
            <>
              {/* Server name dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-12 items-center justify-between border-b border-border px-4 font-display font-semibold text-foreground hover:bg-muted/50">
                    <span className="truncate">{selectedServer.name}</span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-border bg-card" align="start">
                  {selectedServer.invite_code && (
                    <DropdownMenuItem onClick={() => handleCopyInvite(selectedServer.invite_code)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Invite People
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem onClick={() => navigate(`/server-settings/${selectedServer.id}`)}>
                      <Settings className="mr-2 h-4 w-4" /> Server Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isOwner ? (
                    <DropdownMenuItem onClick={() => handleDeleteServer(selectedServer.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Server
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleLeaveServer(selectedServer.id)} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Leave Server
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex-1 overflow-auto p-2">
                {textChannels.length > 0 && (
                  <div className="mb-1">
                    <button className="flex w-full items-center gap-1 px-1 py-1 text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-3 w-3" /> Text Channels
                    </button>
                    {textChannels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { setSelectedChannelId(ch.id); setView("server"); }}
                        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          selectedChannelId === ch.id && view === "server"
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <Hash className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate text-left">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {voiceChannels.length > 0 && (
                  <div>
                    <button className="flex w-full items-center gap-1 px-1 py-1 text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-3 w-3" /> Voice Channels
                    </button>
                    {voiceChannels.map((ch) => (
                      <div key={ch.id}>
                        <button
                          onClick={() => handleJoinVoice(ch)}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                            voiceChannel?.id === ch.id
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <Volume2 className="h-4 w-4 flex-shrink-0" />
                          {ch.name}
                        </button>
                        {voiceChannel?.type === "server" && voiceChannel.id === ch.id && (
                          <div className="ml-6 space-y-0.5 py-0.5">
                            <div className="flex items-center gap-1.5 rounded px-1.5 py-0.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={profile?.avatar_url || ""} />
                                <AvatarFallback className="bg-primary text-[8px] text-primary-foreground">
                                  {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-discord-green">
                                {profile?.display_name || profile?.username}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedServer.invite_code && (
                  <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Invite Link</p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 truncate font-mono text-xs text-foreground">
                        /invite/{selectedServer.invite_code}
                      </p>
                      <button
                        onClick={() => handleCopyInvite(selectedServer.invite_code)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null
        ) : (
          <>
            <div className="flex h-12 items-center border-b border-border px-3">
              <input
                placeholder="Find or start a conversation"
                className="w-full rounded-md bg-secondary px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-auto p-2">
              <button
                onClick={() => { setView("friends"); setSelectedDm(null); }}
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                  view === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Users className="h-5 w-5" /> Friends
              </button>

              <p className="mb-1 mt-3 px-2 text-xs font-bold uppercase text-muted-foreground">
                Direct Messages
              </p>
              {conversations.map((conv) => {
                const other = conv.participants?.[0]?.profiles;
                const name = other?.display_name || other?.username || "User";
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleOpenDm(conv)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedDm?.id === conv.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={other?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                        {name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Voice controls */}
        {voiceChannel && (
          <VoiceControls
            channelName={voiceChannel.name}
            onDisconnect={() => {
              const returnView = voiceChannel.type === "dm" ? "dm" : "server";
              setVoiceChannel(null);
              if (view === "voice") setView(returnView);
            }}
          />
        )}

        {/* User Panel */}
        <div className="flex items-center gap-2 bg-discord-darker p-2">
          <StatusChanger />
          <button onClick={() => navigate("/settings")} className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {view === "voice" ? (
        <VoiceChannelView
          channelName={voiceChannel?.name || "Voice"}
          onLeave={() => {
            setVoiceChannel(null);
            setView("server");
          }}
        />
      ) : view === "server" ? (
        <ChatArea
          channelId={selectedChannelId}
          channelName={selectedChannel?.name || "general"}
          serverId={selectedServerId}
          showMembersToggle
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers(!showMembers)}
        />
      ) : view === "dm" ? (
        <DmChatArea conversation={selectedDm} onStartVoiceCall={handleStartDmCall} />
      ) : (
        <FriendsView onOpenDm={handleOpenDm} />
      )}

      {/* Members Sidebar */}
      {(view === "server" || view === "voice") && selectedServerId && showMembers && (
        <MembersSidebar
          serverId={selectedServerId}
          ownerId={selectedServer?.owner_id}
          currentUserId={user.id}
          statusColor={statusColor}
          onOpenDm={handleOpenMemberDm}
          onSendFriendRequest={handleSendFriendRequestFromMember}
        />
      )}

      <CreateServerDialog open={showServerDialog} onOpenChange={setShowServerDialog} />
    </div>
  );
};

const MembersSidebar = ({
  serverId,
  ownerId,
  currentUserId,
  statusColor,
  onOpenDm,
  onSendFriendRequest,
}: {
  serverId: string;
  ownerId?: string;
  currentUserId: string;
  statusColor: Record<string, string>;
  onOpenDm: (userId: string, profile?: { username?: string; display_name?: string | null; avatar_url?: string | null; status?: string }) => void;
  onSendFriendRequest: (username: string) => void;
}) => {
  const { data: members } = useServerMembers(serverId);

  return (
    <div className="hidden w-60 flex-shrink-0 bg-discord-dark p-4 lg:block">
      <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
        <Users className="mr-1 inline h-3 w-3" /> Members — {(members || []).length}
      </h3>
      {(members || []).map((m: any) => {
        const mProfile = m.profiles;
        const name = mProfile?.display_name || mProfile?.username || "Unknown";
        const isMemberOwner = m.user_id === ownerId;
        const isSelf = m.user_id === currentUserId;
        return (
          <UserProfilePopup
            key={m.id}
            userId={m.user_id}
            side="left"
            actions={
              !isSelf && mProfile?.username ? (
                <div className="space-y-1.5">
                  <button
                    onClick={() => onOpenDm(m.user_id, mProfile)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Send Message</span>
                  </button>
                  <button
                    onClick={() => onSendFriendRequest(mProfile.username)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Send Friend Request</span>
                  </button>
                </div>
              ) : undefined
            }
          >
            <div className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted/50">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={mProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-dark ${statusColor[mProfile?.status || "offline"]}`} />
              </div>
              <span className="flex-1 truncate text-sm text-foreground">{name}</span>
              {isMemberOwner && (
                <Crown className="h-3.5 w-3.5 flex-shrink-0 text-discord-yellow" />
              )}
            </div>
          </UserProfilePopup>
        );
      })}
    </div>
  );
};

export default Index;
