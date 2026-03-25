import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Telescope } from "lucide-react";
import logoImg from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const loginMessage = (error.message || "").toLowerCase();
          if (loginMessage.includes("email not confirmed")) {
            throw new Error("Please verify your email first, then log in.");
          }
          throw error;
        }
        navigate("/");
      } else {
        if (!username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: displayName.trim() || username.trim(),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.session) {
          toast.success("Account created successfully!");
          navigate("/");
          return;
        }

        toast.success("Account created! Verify your email, then log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error: any) {
      const message = error?.message || "Something went wrong";
      if (message.toLowerCase().includes("invalid login credentials")) {
        toast.error("Invalid credentials. If you just signed up, verify your email first.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darker p-4">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src={logoImg} alt="BhosduCord" className="h-24 w-24 drop-shadow-2xl" width={96} height={96} />
          <div className="text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {isLogin ? "Welcome back!" : "Create an account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin ? "We're so excited to see you again!" : "Join the BhosduCord community"}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-border/50 bg-card/80 p-7 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-border/50 bg-secondary/80 text-foreground transition-colors focus:border-primary"
                    placeholder="Choose a unique username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border-border/50 bg-secondary/80 text-foreground transition-colors focus:border-primary"
                    placeholder="How you appear to friends"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border/50 bg-secondary/80 text-foreground transition-colors focus:border-primary"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border/50 bg-secondary/80 pr-10 text-foreground transition-colors focus:border-primary"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 w-full bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Loading...
                </div>
              ) : isLogin ? "Log In" : "Register"}
            </Button>
          </form>

          {/* Toggle */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isLogin ? "Need an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              {isLogin ? "Register" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
