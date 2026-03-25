import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Circle, EyeOff, MinusCircle, Moon } from "lucide-react";

interface UserProfilePopupProps {
  userId: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

interface ProfileData {
  user_id: string;
  username: string;
  discriminator: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  about_me: string | null;
  status: string;
  custom_status: string | null;
  pronouns: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  online: { label: "Online", color: "bg-discord-green", icon: Circle },
  idle: { label: "Idle", color: "bg-discord-yellow", icon: Moon },
  dnd: { label: "Do Not Disturb", color: "bg-discord-red", icon: MinusCircle },
  invisible: { label: "Invisible", color: "bg-discord-grey", icon: EyeOff },
  offline: { label: "Offline", color: "bg-discord-grey", icon: Circle },
};

export const UserProfilePopup = ({ userId, children, side = "top" }: UserProfilePopupProps) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) setProfileData(data as ProfileData);
  };

  const status = statusConfig[profileData?.status || "offline"];
  const name = profileData?.display_name || profileData?.username || "User";

  return (
    <Popover>
      <PopoverTrigger asChild onClick={fetchProfile}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-72 border-border bg-card p-0">
        {profileData ? (
          <>
            <div className="h-16 rounded-t-lg">
              {profileData.banner_url ? (
                <img src={profileData.banner_url} alt="" className="h-full w-full rounded-t-lg object-cover" />
              ) : (
                <div className="h-full rounded-t-lg bg-gradient-to-r from-primary to-accent" />
              )}
            </div>

            <div className="relative px-4">
              <div className="relative -mt-8 inline-block">
                <Avatar className="h-16 w-16 border-4 border-card">
                  <AvatarImage src={profileData.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-card ${status.color}`} />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto px-4 pb-4 pt-2">
              <h3 className="font-display text-lg font-bold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {profileData.username}#{profileData.discriminator}
                {profileData.pronouns && ` · ${profileData.pronouns}`}
              </p>

              {profileData.custom_status && (
                <p className="mt-1 text-sm text-foreground/80">{profileData.custom_status}</p>
              )}

              <Separator className="my-3" />

              {profileData.about_me && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">About Me</p>
                  <p className="text-sm text-foreground/80">{profileData.about_me}</p>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Member Since</p>
                <p className="text-sm text-foreground/80">
                  {new Date(profileData.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const StatusChanger = () => {
  const { profile, updateProfile } = useProfile();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const statuses = [
    { value: "online", label: "Online", color: "bg-discord-green", icon: Circle },
    { value: "idle", label: "Idle", color: "bg-discord-yellow", icon: Moon },
    { value: "dnd", label: "Do Not Disturb", color: "bg-discord-red", icon: MinusCircle },
    { value: "invisible", label: "Invisible", color: "bg-discord-grey", icon: EyeOff },
  ];

  const handleStatusChange = async (status: string) => {
    await updateProfile.mutateAsync({ status } as any);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-muted/50">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-darker ${statusConfig[profile?.status || "offline"].color}`} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.display_name || profile?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.custom_status || statusConfig[profile?.status || "offline"].label}
            </p>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className="w-72 border-border bg-card p-0">
        <div className="h-16 rounded-t-lg bg-gradient-to-r from-primary to-accent" />

        <div className="relative px-4">
          <div className="relative -mt-8 inline-block">
            <Avatar className="h-16 w-16 border-4 border-card">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-card ${statusConfig[profile?.status || "offline"].color}`} />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-4 pb-4 pt-2">
          <h3 className="font-display text-lg font-bold text-foreground">
            {profile?.display_name || profile?.username}
          </h3>
          <p className="text-sm text-muted-foreground">
            {profile?.username}#{profile?.discriminator}
          </p>

          {profile?.about_me && (
            <>
              <Separator className="my-3" />
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">About Me</p>
                <p className="text-sm text-foreground/80">{profile.about_me}</p>
              </div>
            </>
          )}

          <Separator className="my-3" />

          <div
            className="rounded-md"
            onMouseEnter={() => setStatusMenuOpen(true)}
            onMouseLeave={() => setStatusMenuOpen(false)}
          >
            <button className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/50">
              <span>Change Status</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className={`overflow-hidden transition-all duration-150 ${statusMenuOpen ? "max-h-60" : "max-h-0"}`}>
              <div className="mt-1 space-y-1 rounded-md bg-secondary/40 p-1.5">
                {statuses.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${
                        profile?.status === s.value ? "bg-muted text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};