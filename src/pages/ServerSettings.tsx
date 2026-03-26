import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChannels } from "@/hooks/useServer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft, Settings, Hash, Volume2, ImagePlus, Trash2, Plus, ArrowUp, ArrowDown
} from "lucide-react";

type Tab = "overview" | "channels";

const ServerSettings = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const { data: server, isLoading } = useQuery({
    queryKey: ["server-detail", serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .eq("id", serverId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!serverId,
  });

  const { data: channels } = useChannels(serverId || null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // New channel
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Text Channels");

  const categoryMeta = Array.from(
    new Map(
      (channels || [])
        .slice()
        .sort((a, b) => ((a.category_position ?? 0) - (b.category_position ?? 0)) || (a.position - b.position))
        .map((ch: any) => [ch.category || "Uncategorized", ch.category_position ?? 0])
    ).entries()
  )
    .map(([name, position]) => ({ name, position }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  useEffect(() => {
    if (categoryMeta.length > 0 && !categoryMeta.some((c) => c.name === selectedCategory)) {
      setSelectedCategory(categoryMeta[0].name);
    }
  }, [categoryMeta, selectedCategory]);

  useEffect(() => {
    if (server && !initialized) {
      setName(server.name);
      setDescription(server.description || "");
      setIsPublic(server.is_public);
      setInitialized(true);
    }
  }, [server, initialized]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!server || server.owner_id !== user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">Only the server owner can access settings.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from("servers")
      .update({ name, description, is_public: isPublic })
      .eq("id", server.id);
    if (error) toast.error("Failed to save");
    else {
      toast.success("Server updated!");
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["server-detail", serverId] });
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `server-icons/${server.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("servers").update({ icon_url: urlData.publicUrl }).eq("id", server.id);
      toast.success("Icon updated!");
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["server-detail", serverId] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const category = selectedCategory || (newChannelType === "text" ? "Text Channels" : "Voice Channels");
    const sameCategory = (channels || []).filter((ch: any) => ch.category === category);
    const categoryPosition = sameCategory[0]?.category_position ?? (Math.max(-1, ...(channels || []).map((ch: any) => ch.category_position ?? 0)) + 1);
    const { error } = await supabase.from("channels").insert({
      server_id: server.id,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-"),
      type: newChannelType,
      category,
      category_position: categoryPosition,
      position: sameCategory.length,
    });
    if (error) toast.error("Failed to create channel");
    else {
      toast.success("Channel created!");
      setNewChannelName("");
      queryClient.invalidateQueries({ queryKey: ["channels", serverId] });
    }
  };

  const handleCreateCategory = async () => {
    const category = newCategoryName.trim();
    if (!category) return;
    if (categoryMeta.some((c) => c.name.toLowerCase() === category.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }

    const nextCategoryPosition = Math.max(-1, ...categoryMeta.map((c) => c.position)) + 1;
    const starterName = category.toLowerCase().replace(/[^a-z0-9-\s]/g, "").trim().replace(/\s+/g, "-") || "channel";

    const { error } = await supabase.from("channels").insert({
      server_id: server.id,
      name: starterName,
      type: "text",
      category,
      category_position: nextCategoryPosition,
      position: 0,
    });

    if (error) {
      toast.error("Failed to create category");
      return;
    }

    toast.success("Category created");
    setSelectedCategory(category);
    setNewCategoryName("");
    queryClient.invalidateQueries({ queryKey: ["channels", serverId] });
  };

  const handleMoveCategory = async (category: string, direction: -1 | 1) => {
    const idx = categoryMeta.findIndex((c) => c.name === category);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= categoryMeta.length) return;

    const current = categoryMeta[idx];
    const target = categoryMeta[targetIdx];

    const [first, second] = await Promise.all([
      supabase.from("channels").update({ category_position: target.position }).eq("server_id", server.id).eq("category", current.name),
      supabase.from("channels").update({ category_position: current.position }).eq("server_id", server.id).eq("category", target.name),
    ]);

    if (first.error || second.error) {
      toast.error("Failed to reorder categories");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["channels", serverId] });
  };

  const handleMoveChannel = async (channelId: string, direction: -1 | 1) => {
    const channel = (channels || []).find((ch: any) => ch.id === channelId);
    if (!channel) return;

    const list = (channels || [])
      .filter((ch: any) => ch.category === channel.category)
      .slice()
      .sort((a: any, b: any) => a.position - b.position);

    const idx = list.findIndex((ch: any) => ch.id === channelId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;

    const target = list[targetIdx];

    const [first, second] = await Promise.all([
      supabase.from("channels").update({ position: target.position }).eq("id", channel.id),
      supabase.from("channels").update({ position: channel.position }).eq("id", target.id),
    ]);

    if (first.error || second.error) {
      toast.error("Failed to reorder channels");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["channels", serverId] });
  };

  const handleDeleteChannel = async (channelId: string) => {
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) toast.error("Failed to delete channel");
    else {
      toast.success("Channel deleted!");
      queryClient.invalidateQueries({ queryKey: ["channels", serverId] });
    }
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "overview", icon: Settings, label: "Overview" },
    { id: "channels", icon: Hash, label: "Channels" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-56 flex-shrink-0 bg-discord-dark p-4 md:block">
        <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="mb-4 font-display text-xs font-bold uppercase text-muted-foreground">
          Server Settings
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
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {tab === "overview" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Server Overview</h1>

              {/* Icon */}
              <div className="mb-6 flex items-center gap-4">
                <div className="group relative cursor-pointer" onClick={() => iconInputRef.current?.click()}>
                  <Avatar className="h-20 w-20 border-4 border-card">
                    {server.icon_url ? (
                      <AvatarImage src={server.icon_url} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                      {server.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <ImagePlus className="h-6 w-6 text-white" />
                  </div>
                  <input ref={iconInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Server Icon</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              </div>

              <div className="space-y-6 rounded-lg bg-card p-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Server Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary text-foreground" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] bg-secondary text-foreground"
                    placeholder="What's this server about?"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Public Server</p>
                    <p className="text-xs text-muted-foreground">Show in Discovery</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => {
                    setName(server.name);
                    setDescription(server.description || "");
                    setIsPublic(server.is_public);
                  }}>Reset</Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>

              {/* Danger zone */}
              <div className="mt-6 rounded-lg border border-destructive/30 bg-card p-6">
                <h3 className="mb-2 text-sm font-bold text-destructive">Danger Zone</h3>
                <p className="mb-4 text-xs text-muted-foreground">Once deleted, this cannot be undone.</p>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const { error } = await supabase.from("servers").delete().eq("id", server.id);
                    if (error) toast.error("Failed to delete");
                    else {
                      toast.success("Server deleted");
                      navigate("/");
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Server
                </Button>
              </div>
            </>
          )}

          {tab === "channels" && (
            <>
              <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Channels</h1>

              {/* Create channel */}
              <div className="mb-6 rounded-lg bg-card p-4">
                <h3 className="mb-3 text-sm font-bold text-foreground">Create Channel</h3>
                <div className="flex gap-2">
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="channel-name"
                    className="flex-1 bg-secondary text-foreground"
                  />
                  <select
                    value={newChannelType}
                    onChange={(e) => setNewChannelType(e.target.value as "text" | "voice")}
                    className="rounded-md bg-secondary px-3 text-sm text-foreground"
                  >
                    <option value="text">Text</option>
                    <option value="voice">Voice</option>
                  </select>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-md bg-secondary px-3 text-sm text-foreground"
                  >
                    {categoryMeta.map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <Button onClick={handleCreateChannel} size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Create
                  </Button>
                </div>
              </div>

              <div className="mb-6 rounded-lg bg-card p-4">
                <h3 className="mb-3 text-sm font-bold text-foreground">Create Category</h3>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1 bg-secondary text-foreground"
                  />
                  <Button onClick={handleCreateCategory} size="sm">Add</Button>
                </div>
              </div>

              {/* Channel list */}
              <div className="space-y-4">
                {categoryMeta.map((category, categoryIndex) => {
                  const categoryChannels = (channels || [])
                    .filter((ch: any) => ch.category === category.name)
                    .slice()
                    .sort((a: any, b: any) => a.position - b.position);

                  return (
                    <div key={category.name} className="rounded-lg bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-muted-foreground">{category.name}</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveCategory(category.name, -1)}
                            disabled={categoryIndex === 0}
                            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveCategory(category.name, 1)}
                            disabled={categoryIndex === categoryMeta.length - 1}
                            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {categoryChannels.map((ch: any, index: number) => (
                          <div key={ch.id} className="flex items-center justify-between rounded-md bg-secondary/40 p-2">
                            <div className="flex items-center gap-2">
                              {ch.type === "voice" ? (
                                <Volume2 className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Hash className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm text-foreground">{ch.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveChannel(ch.id, -1)}
                                disabled={index === 0}
                                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMoveChannel(ch.id, 1)}
                                disabled={index === categoryChannels.length - 1}
                                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteChannel(ch.id)}
                                className="rounded p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
