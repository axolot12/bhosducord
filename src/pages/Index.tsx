import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Hash, Volume2, Settings, Plus, ChevronDown, MessageSquare, Users, Compass } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

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

  const statusColor = {
    online: "bg-discord-green",
    idle: "bg-discord-yellow",
    dnd: "bg-discord-red",
    invisible: "bg-discord-grey",
    offline: "bg-discord-grey",
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Server List */}
      <div className="flex w-[72px] flex-shrink-0 flex-col items-center gap-2 bg-discord-darker py-3">
        {/* Home */}
        <button className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary transition-all hover:rounded-xl">
          <MessageSquare className="h-6 w-6 text-primary-foreground" />
        </button>
        <div className="mx-auto h-0.5 w-8 rounded-full bg-border" />
        {/* Placeholder servers */}
        {["G", "D", "M"].map((letter, i) => (
          <button
            key={i}
            className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-secondary font-display text-sm font-bold text-secondary-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-primary-foreground"
          >
            {letter}
          </button>
        ))}
        <button className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-secondary text-discord-green transition-all hover:rounded-xl hover:bg-discord-green hover:text-primary-foreground">
          <Plus className="h-5 w-5" />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-secondary text-discord-green transition-all hover:rounded-xl hover:bg-discord-green hover:text-primary-foreground">
          <Compass className="h-5 w-5" />
        </button>
      </div>

      {/* Channel Sidebar */}
      <div className="flex w-60 flex-shrink-0 flex-col bg-discord-dark">
        {/* Server Header */}
        <button className="flex h-12 items-center justify-between border-b border-border px-4 font-display font-semibold text-foreground hover:bg-muted/50">
          <span>My Server</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Channels */}
        <div className="flex-1 overflow-auto p-2">
          <div className="mb-1">
            <button className="flex w-full items-center gap-1 px-1 py-1 text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Text Channels
            </button>
            {["general", "off-topic", "announcements"].map((ch) => (
              <button
                key={ch}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <Hash className="h-4 w-4 flex-shrink-0" />
                {ch}
              </button>
            ))}
          </div>
          <div>
            <button className="flex w-full items-center gap-1 px-1 py-1 text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Voice Channels
            </button>
            {["General", "Gaming"].map((ch) => (
              <button
                key={ch}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <Volume2 className="h-4 w-4 flex-shrink-0" />
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* User Panel */}
        <div className="flex items-center gap-2 bg-discord-darker p-2">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-darker ${statusColor[profile?.status || "offline"]}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.display_name || profile?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.custom_status || "Online"}
            </p>
          </div>
          <button onClick={() => navigate("/settings")} className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Channel Header */}
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <span className="font-display font-semibold text-foreground">general</span>
          <div className="mx-2 h-6 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Welcome to the server!</span>
        </div>

        {/* Messages Area */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Hash className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Welcome to #general
            </h2>
            <p className="mt-1 text-muted-foreground">
              This is the beginning of the #general channel.
            </p>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5">
            <Plus className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Message #general"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="hidden w-60 flex-shrink-0 bg-discord-dark p-4 lg:block">
        <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
          <Users className="mr-1 inline h-3 w-3" /> Online — 1
        </h3>
        <div className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-dark ${statusColor[profile?.status || "offline"]}`} />
          </div>
          <span className="text-sm text-foreground">
            {profile?.display_name || profile?.username}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;
