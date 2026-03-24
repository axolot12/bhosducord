import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ArrowLeft, Telescope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

const Discovery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["public-servers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("id, name, icon_url, description, member_count, invite_code")
        .eq("is_public", true)
        .order("member_count", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleJoin = async (serverId: string, serverName: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const { error } = await supabase
        .from("server_members")
        .insert({ server_id: serverId, user_id: user.id });
      if (error) {
        if (error.code === "23505") {
          toast.info("Already a member!");
        } else throw error;
      } else {
        toast.success(`Joined ${serverName}!`);
      }
      navigate("/");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-discord-darker to-discord-darker px-6 py-16 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-discord-blurple/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <button onClick={() => navigate("/")} className="absolute left-4 top-0 rounded-lg bg-secondary/80 p-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Telescope className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-2 font-display text-4xl font-extrabold text-foreground">
            Discover Servers
          </h1>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Find communities to join on BhosduCord
          </p>
          <div className="mx-auto max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search public servers..."
                className="bg-secondary/80 pl-10 text-foreground backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Telescope className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold text-foreground">No servers found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search" : "No public servers yet. Be the first to create one!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(server => (
              <div
                key={server.id}
                className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Server banner placeholder */}
                <div className="h-32 bg-gradient-to-br from-primary/30 to-discord-blurple/20" />
                <div className="relative px-4 pb-4">
                  <Avatar className="-mt-8 mb-3 h-14 w-14 border-4 border-card">
                    {server.icon_url ? <AvatarImage src={server.icon_url} /> : null}
                    <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                      {server.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mb-1 font-display text-lg font-bold text-foreground">{server.name}</h3>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {server.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {server.member_count} members
                    </span>
                    <Button size="sm" onClick={() => handleJoin(server.id, server.name)}>
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
