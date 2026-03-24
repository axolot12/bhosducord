import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Telescope } from "lucide-react";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

interface ServerInfo {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  member_count: number;
  is_public: boolean;
}

const Invite = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    const fetchServer = async () => {
      if (!code) return;
      const { data, error } = await supabase
        .from("servers")
        .select("id, name, icon_url, description, member_count, is_public")
        .eq("invite_code", code)
        .single();

      if (error || !data) {
        setServer(null);
      } else {
        setServer(data);
        // Check membership
        if (user) {
          const { data: member } = await supabase
            .from("server_members")
            .select("id")
            .eq("server_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          setAlreadyMember(!!member);
        }
      }
      setLoading(false);
    };
    fetchServer();
  }, [code, user]);

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!server) return;
    setJoining(true);
    try {
      const { error } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });
      if (error) {
        if (error.code === "23505") {
          toast.info("You're already a member!");
        } else {
          throw error;
        }
      } else {
        toast.success(`Joined ${server.name}!`);
      }
      navigate("/");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-discord-darker">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darker p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <img src={logoImg} alt="BhosduCord" className="mb-4 h-12 w-12" />
          <p className="text-sm text-muted-foreground">You've been invited to join a server</p>
        </div>

        {server ? (
          <div className="rounded-xl border border-border/50 bg-card/90 p-6 text-center shadow-2xl backdrop-blur-sm">
            <Avatar className="mx-auto mb-4 h-20 w-20">
              {server.icon_url ? (
                <AvatarImage src={server.icon_url} />
              ) : null}
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {server.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <h1 className="mb-1 font-display text-2xl font-bold text-foreground">{server.name}</h1>
            {server.description && (
              <p className="mb-3 text-sm text-muted-foreground">{server.description}</p>
            )}

            <div className="mb-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{server.member_count} member{server.member_count !== 1 ? "s" : ""}</span>
            </div>

            {alreadyMember ? (
              <Button onClick={() => navigate("/")} className="w-full">
                Already a Member — Go Home
              </Button>
            ) : (
              <Button onClick={handleJoin} disabled={joining} className="w-full">
                {joining ? "Joining..." : "Accept Invite"}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/90 p-6 text-center shadow-2xl backdrop-blur-sm">
            <Telescope className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 font-display text-xl font-bold text-foreground">Invalid Invite</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This invite may have expired or the server doesn't exist.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invite;
