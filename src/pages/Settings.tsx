import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, LogOut, User, Shield, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setDisplayName(profile.display_name || "");
    setAboutMe(profile.about_me || "");
    setPronouns(profile.pronouns || "");
    setCustomStatus(profile.custom_status || "");
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        about_me: aboutMe,
        pronouns,
        custom_status: customStatus,
      } as any);
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    try {
      await uploadAvatar(file);
      toast.success("Avatar updated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-56 flex-shrink-0 bg-discord-dark p-4 md:block">
        <h2 className="mb-4 font-display text-xs font-bold uppercase text-muted-foreground">
          User Settings
        </h2>
        <nav className="space-y-1">
          {[
            { icon: User, label: "My Account", active: true },
            { icon: Shield, label: "Privacy & Safety" },
            { icon: Palette, label: "Appearance" },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <Separator className="my-4" />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 font-display text-2xl font-bold text-foreground">My Account</h1>

          {/* Profile Banner */}
          <div className="overflow-hidden rounded-lg bg-card">
            <div className="h-24 bg-gradient-to-r from-primary to-discord-blurple" />
            <div className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="relative -mt-12 mb-4 inline-block">
                <Avatar className="h-20 w-20 border-4 border-card">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/80"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  {profile?.display_name || profile?.username}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile?.username}#{profile?.discriminator}
                  {profile?.pronouns && ` · ${profile.pronouns}`}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="mt-6 space-y-6 rounded-lg bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-secondary text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Pronouns
                </Label>
                <Input
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="bg-secondary text-foreground"
                  placeholder="e.g. they/them"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Custom Status
              </Label>
              <Input
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="bg-secondary text-foreground"
                placeholder="What's on your mind?"
                maxLength={128}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                About Me
              </Label>
              <Textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="min-h-[100px] bg-secondary text-foreground"
                placeholder="Tell others about yourself..."
                maxLength={190}
              />
              <p className="text-right text-xs text-muted-foreground">
                {aboutMe.length}/190
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                profile?.email_verified
                  ? "bg-discord-green/20 text-discord-green"
                  : "bg-discord-yellow/20 text-discord-yellow"
              }`}>
                {profile?.email_verified ? "Verified" : "Unverified"}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-border text-foreground"
                onClick={() => {
                  setDisplayName(profile?.display_name || "");
                  setAboutMe(profile?.about_me || "");
                  setPronouns(profile?.pronouns || "");
                  setCustomStatus(profile?.custom_status || "");
                }}
              >
                Reset
              </Button>
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Mobile Logout */}
          <div className="mt-6 md:hidden">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
