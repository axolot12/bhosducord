import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic, MicOff, Headphones, HeadphoneOff, Monitor, PhoneOff, Video, VideoOff,
  Signal
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface VoiceChannelProps {
  channelName: string;
  onDisconnect: () => void;
}

export const VoiceControls = ({ channelName, onDisconnect }: VoiceChannelProps) => {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="border-t border-border bg-discord-darker">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
      </div>
    </div>
  );
};

export const VoiceChannelView = ({ channelName, onLeave }: { channelName: string; onLeave: () => void }) => {
  const { profile } = useProfile();
  const displayName = profile?.display_name || profile?.username || "User";

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingFrameRef = useRef<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Start microphone on mount
  useEffect(() => {
    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;

        // Set up audio analyser for speaking indicator
        const ctx = new AudioContext();
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkSpeaking = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setIsSpeaking(avg > 15);
          speakingFrameRef.current = requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
        setMicReady(true);
        setMicError(null);
      } catch (error: any) {
        setMicReady(false);
        setMicError(error?.message || "Could not access microphone");
        toast.error("Could not access microphone");
      }
    };
    startMic();

    return () => {
      if (speakingFrameRef.current) {
        cancelAnimationFrame(speakingFrameRef.current);
        speakingFrameRef.current = null;
      }
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  // Handle mute/unmute
  useEffect(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !muted;
      });
    }
  }, [muted]);

  // Handle deafen
  useEffect(() => {
    if (deafened && !muted) setMuted(true);
  }, [deafened]);

  useEffect(() => {
    if (muted || deafened) {
      setIsSpeaking(false);
    }
  }, [muted, deafened]);

  const toggleVideo = useCallback(async () => {
    if (videoOn) {
      // Stop all video tracks to fully release the camera
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach(t => {
          t.stop();
          t.enabled = false;
        });
        camStreamRef.current = null;
      }
      // Clear all video elements that might hold the stream
      if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
        localVideoRef.current.load();
      }
      setVideoOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setVideoOn(true);
      } catch {
        toast.error("Could not access camera");
      }
    }
  }, [videoOn]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }
        // Handle user clicking "Stop sharing" in browser UI
        stream.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } catch {
        toast.error("Screen share cancelled or not supported");
      }
    }
  }, [screenSharing]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Main view area */}
      <div className="flex flex-1 items-center justify-center p-6">
        {/* Persistent video elements — never conditionally unmounted */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={
            screenSharing && videoOn
              ? "absolute bottom-8 right-8 z-10 h-32 w-44 rounded-lg border-2 border-border object-cover shadow-lg"
              : videoOn
              ? "h-full max-h-[70vh] w-full max-w-2xl rounded-xl border border-border object-cover"
              : "hidden"
          }
        />
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          className={screenSharing ? "h-full max-h-[70vh] w-full rounded-xl border border-border object-contain" : "hidden"}
        />

        {!screenSharing && !videoOn && (
          <div className="text-center">
            <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full transition-all ${
              isSpeaking ? "bg-discord-green/20 ring-4 ring-discord-green/50" : "bg-secondary"
            }`}>
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
              {channelName}
            </h2>
            <p className="mb-1 text-sm text-foreground">{displayName}</p>
            <p className={`text-xs ${isSpeaking && !muted ? "text-discord-green" : "text-muted-foreground"}`}>
              {muted ? "Muted" : isSpeaking ? "Speaking" : "Connected"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls bar */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-discord-darker px-4 py-3">
        <button
          onClick={() => setMuted(!muted)}
          className={`rounded-full p-3 transition-colors ${
            muted ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-muted"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          onClick={() => {
            setDeafened(!deafened);
            if (!deafened) setMuted(true);
          }}
          className={`rounded-full p-3 transition-colors ${
            deafened ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-muted"
          }`}
          title={deafened ? "Undeafen" : "Deafen"}
        >
          {deafened ? <HeadphoneOff className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`rounded-full p-3 transition-colors ${
            videoOn ? "bg-discord-green text-white" : "bg-secondary text-foreground hover:bg-muted"
          }`}
          title={videoOn ? "Turn Off Camera" : "Turn On Camera"}
        >
          {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-3 transition-colors ${
            screenSharing ? "bg-discord-green text-white" : "bg-secondary text-foreground hover:bg-muted"
          }`}
          title={screenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <Monitor className="h-5 w-5" />
        </button>

        <button
            onClick={onLeave}
          className="rounded-full bg-destructive p-3 text-destructive-foreground transition-colors hover:bg-destructive/80"
          title="Leave Voice"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>

        <div className="border-t border-border bg-discord-darker px-4 py-1.5 text-center text-xs text-muted-foreground">
          {micError ? micError : micReady ? "Microphone connected" : "Connecting microphone..."}
        </div>
    </div>
  );
};
