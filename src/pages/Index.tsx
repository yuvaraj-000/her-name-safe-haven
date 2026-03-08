import { motion } from "framer-motion";
import { Shield, FileText, Lock, Map, ClipboardList, Phone, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Shield, title: "Emergency SOS", desc: "Instant alert with location tracking", path: "/sos", color: "bg-sos/10 text-sos" },
  { icon: FileText, title: "Report Incident", desc: "Secure & anonymous reporting", path: "/report", color: "bg-primary/10 text-primary" },
  { icon: Lock, title: "Evidence Vault", desc: "Encrypted file storage", path: "/vault", color: "bg-safe/10 text-safe" },
  { icon: Map, title: "Safety Map", desc: "Community danger zones", path: "/safety-map", color: "bg-accent/10 text-accent" },
  { icon: ClipboardList, title: "Case Tracking", desc: "Monitor report progress", path: "/cases", color: "bg-warning/10 text-warning" },
  { icon: Phone, title: "Helplines", desc: "Quick access to help", path: "/helplines", color: "bg-primary/10 text-primary" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary to-secondary/90 px-6 pb-10 pt-14">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, hsl(var(--primary)), transparent 60%)" }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
          <h1 className="font-display text-4xl font-bold text-secondary-foreground">
            Her<span className="text-gradient-primary">Net</span>
          </h1>
          <p className="mt-2 text-sm text-secondary-foreground/70 max-w-[280px]">
            Hi {firstName}! Your safety companion is always ready.
          </p>
          <button
            onClick={() => navigate("/sos")}
            className="mt-6 flex items-center gap-2 rounded-full bg-sos px-6 py-3 text-sm font-bold text-sos-foreground shadow-sos transition-transform hover:scale-105"
          >
            <Shield className="h-4 w-4" />
            Quick SOS
          </button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-6 py-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.button
              key={f.path}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              onClick={() => navigate(f.path)}
              className="flex flex-col items-start gap-3 rounded-xl bg-card p-4 shadow-card text-left transition-all hover:shadow-soft active:scale-[0.98]"
            >
              <div className={`rounded-lg p-2.5 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-card-foreground">{f.title}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Safety Tips */}
      <div className="px-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">Safety Tips</h2>
        {[
          "Share your live location with trusted contacts when traveling alone.",
          "Save emergency numbers on speed dial for quick access.",
          "Trust your instincts — if something feels wrong, seek help immediately.",
        ].map((tip, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + 0.1 * i }} className="mb-2 flex items-start gap-3 rounded-lg bg-card p-3 shadow-card">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-card-foreground/80">{tip}</p>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
