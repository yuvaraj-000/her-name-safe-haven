import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, KeyRound, ArrowLeft, Lock } from "lucide-react";
import { useAuthority } from "@/contexts/AuthorityContext";
import { useToast } from "@/hooks/use-toast";

const AuthorityLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authorityLogin } = useAuthority();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = authorityLogin(code);
      if (success) {
        toast({ title: "Access Granted", description: "Welcome, Officer. Dashboard loading..." });
        navigate("/authority/dashboard");
      } else {
        toast({ title: "Access Denied", description: "Invalid authority code.", variant: "destructive" });
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "linear-gradient(135deg, hsl(220 30% 8%), hsl(220 40% 14%), hsl(220 30% 8%))" }}>
      {/* Header */}
      <div className="relative px-6 pb-10 pt-12">
        <button onClick={() => navigate("/login")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to User Login
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30" style={{ background: "linear-gradient(135deg, hsl(220 40% 16%), hsl(220 30% 20%))" }}>
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Authority <span className="text-gradient-primary">Portal</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Law Enforcement Access Only</p>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">SECURED & ENCRYPTED</span>
          </div>
        </motion.div>
      </div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 px-6">
        <div className="rounded-2xl border border-border/50 p-6" style={{ background: "linear-gradient(180deg, hsl(220 25% 14%), hsl(220 25% 12%))" }}>
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enter Access Code</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-muted-foreground">Authority Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  type="password"
                  placeholder="Enter authority code"
                  className="border-border/50 bg-secondary/50 pl-10 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Access Dashboard
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-xs text-warning text-center">
              ⚠️ Unauthorized access is a criminal offense. All access attempts are logged and monitored.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          HerName Authority System v1.0 • Law Enforcement Use Only
        </p>
      </div>
    </div>
  );
};

export default AuthorityLogin;
