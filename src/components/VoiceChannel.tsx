import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic, MicOff, Headphones, HeadphoneOff, Monitor, PhoneOff, Video, VideoOff,
  Settings, Signal
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

interface VoiceChannelProps {
  channelName: string;
  onDisconnect: () => void;
}

export const VoiceControls = ({ channelName, onDisconnect }: VoiceChannelProps) => {
  const { profile } = useProfile();
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [video, setVideo] = useState(false);
  const [screenShare, setScreenShare] = useState(false);

  const displayName = profile?.display_name || profile?.username || "User";

  return (
    <div className="border-t border-border bg-discord-darker">
      {/* Connected state */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Signal className="h-4 w-4 flex-shrink-0 text-discord-green" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-discord-green">Voice Connected</p>
            <p className="truncate text-[10px] text-muted-foreground">{channelName}</p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          title="Disconnect"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-1 px-2 pb-1.5">
        <button
          onClick={() => setMuted(!muted)}
          className={`rounded-md p-2 transition-colors ${
            muted ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          onClick={() => {
            setDeafened(!deafened);
            if (!deafened) setMuted(true);
          }}
          className={`rounded-md p-2 transition-colors ${
            deafened ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={deafened ? "Undeafen" : "Deafen"}
        >
          {deafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        </button>

        <button
          onClick={() => setVideo(!video)}
          className={`rounded-md p-2 transition-colors ${
            video ? "bg-discord-green/20 text-discord-green" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={video ? "Turn Off Camera" : "Turn On Camera"}
        >
          {video ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>

        <button
          onClick={() => setScreenShare(!screenShare)}
          className={`rounded-md p-2 transition-colors ${
            screenShare ? "bg-discord-green/20 text-discord-green" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={screenShare ? "Stop Sharing" : "Share Screen"}
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const VoiceChannelView = ({ channelName }: { channelName: string }) => {
  const { profile } = useProfile();
  const displayName = profile?.display_name || profile?.username || "User";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
          <Signal className="h-12 w-12 text-discord-green" />
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
          Voice Channel: {channelName}
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          You're connected to a voice channel
        </p>

        {/* Connected user */}
        <div className="mx-auto max-w-xs space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-card p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-discord-green">Speaking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
