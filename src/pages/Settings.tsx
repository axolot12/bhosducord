import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, LogOut, User, Shield, Palette, Bell, Accessibility, ArrowLeft, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SettingsTab = "account" | "appearance" | "notifications" | "accessibility";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<SettingsTab>("account");
  const [displayName, setDisplayName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Appearance
  const [zoomLevel, setZoomLevel] = useState([100]);
  const [textScale, setTextScale] = useState([100]);

  // Notifications
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Accessibility
  const [reducedMotion, setReducedMotion] = useState(false);

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
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    try {
      await uploadAvatar(file);
      toast.success("Avatar updated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user!.id}/banner.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile.mutateAsync({ banner_url: urlData.publicUrl } as any);
      toast.success("Banner updated!");
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

  const tabs: { id: SettingsTab; icon: any; label: string }[] = [
    { id: "account", icon: User, label: "My Account" },
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "accessibility", icon: Accessibility, label: "Accessibility" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-56 flex-shrink-0 bg-discord-dark p-4 md:block">
        <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="mb-4 font-display text-xs font-bold uppercase text-muted-foreground">
          User Settings
        </h2>
        <nav className="space-y-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                tab === id
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
          {/* Mobile back */}
          <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {tab === "account" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">My Account</h1>

              {/* Profile Banner */}
              <div className="overflow-hidden rounded-lg bg-card">
                <div className="group relative h-32">
                  {(profile as any)?.banner_url ? (
                    <img src={(profile as any).banner_url} alt="Banner" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full bg-gradient-to-r from-primary to-discord-blurple" />
                  )}
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
                  >
                    <ImagePlus className="h-6 w-6 text-primary-foreground" />
                  </button>
                  <input ref={bannerInputRef} type="file" accept="image/*,.gif" onChange={handleBannerUpload} className="hidden" />
                </div>
                <div className="relative px-6 pb-6">
                  <div className="relative -mt-12 mb-4 inline-block">
                    <Avatar className="h-20 w-20 border-4 border-card">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                        {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/80"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,.gif" onChange={handleAvatarUpload} className="hidden" />
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
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-secondary text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Pronouns</Label>
                    <Input value={pronouns} onChange={(e) => setPronouns(e.target.value)} className="bg-secondary text-foreground" placeholder="e.g. they/them" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Custom Status</Label>
                  <Input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} className="bg-secondary text-foreground" placeholder="What's on your mind?" maxLength={128} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">About Me</Label>
                  <Textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} className="min-h-[100px] bg-secondary text-foreground" placeholder="Tell others about yourself..." maxLength={190} />
                  <p className="text-right text-xs text-muted-foreground">{aboutMe.length}/190</p>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    profile?.email_verified ? "bg-discord-green/20 text-discord-green" : "bg-discord-yellow/20 text-discord-yellow"
                  }`}>
                    {profile?.email_verified ? "Verified" : "Unverified"}
                  </span>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" className="border-border text-foreground" onClick={() => {
                    setDisplayName(profile?.display_name || "");
                    setAboutMe(profile?.about_me || "");
                    setPronouns(profile?.pronouns || "");
                    setCustomStatus(profile?.custom_status || "");
                  }}>Reset</Button>
                  <Button onClick={handleSave} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {tab === "appearance" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Appearance</h1>
              <div className="space-y-6 rounded-lg bg-card p-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Zoom Level — {zoomLevel[0]}%</Label>
                  <Slider value={zoomLevel} onValueChange={setZoomLevel} min={50} max={200} step={10} />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Text Scaling — {textScale[0]}%</Label>
                  <Slider value={textScale} onValueChange={setTextScale} min={50} max={200} step={10} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["English", "Spanish", "French", "German", "Portuguese", "Japanese", "Korean", "Chinese", "Russian", "Arabic", "Hindi", "Italian", "Dutch", "Polish", "Turkish", "Swedish", "Norwegian", "Danish", "Finnish", "Czech", "Romanian", "Hungarian", "Greek", "Thai", "Vietnamese", "Indonesian"].map(lang => (
                        <SelectItem key={lang} value={lang.toLowerCase().slice(0, 2)}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {tab === "notifications" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Notifications</h1>
              <div className="space-y-4 rounded-lg bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Desktop Notifications</p>
                    <p className="text-xs text-muted-foreground">Show notifications on your desktop</p>
                  </div>
                  <Switch checked={desktopNotifs} onCheckedChange={setDesktopNotifs} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sound</p>
                    <p className="text-xs text-muted-foreground">Play sound for incoming messages</p>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">@mentions Only</p>
                    <p className="text-xs text-muted-foreground">Only notify when directly mentioned</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </>
          )}

          {tab === "accessibility" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Accessibility</h1>
              <div className="space-y-4 rounded-lg bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Reduced Motion</p>
                    <p className="text-xs text-muted-foreground">Reduce animations and motion effects</p>
                  </div>
                  <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Screen Reader Support</p>
                    <p className="text-xs text-muted-foreground">Optimize for screen readers</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Colorblind Mode</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="protanopia">Protanopia</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Mobile Logout */}
          <div className="mt-6 md:hidden">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
