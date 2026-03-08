import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "User";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight neon-text" style={{ animation: "neon-flicker 4s infinite" }}>
            Her<span className="text-primary">Net</span>
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-widest uppercase">Your safety. Your power.</p>
        </div>
        <p className="text-xs text-muted-foreground">Hi, <span className="text-foreground font-medium">{name.split(" ")[0]}</span></p>
      </div>

      {/* SOS Center */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="relative flex flex-col items-center"
        >
          {/* Ripple rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-full border border-primary/10 animate-ripple" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-full border border-primary/5 animate-ripple" style={{ animationDelay: "0.5s" }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-full border border-primary/5 animate-ripple" style={{ animationDelay: "1s" }} />
          </div>

          {/* SOS Button */}
          <button
            onClick={() => navigate("/sos")}
            className="relative z-10 flex h-48 w-48 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-neon transition-transform hover:scale-105 active:scale-95 animate-sos-pulse"
          >
            <Shield className="h-14 w-14 mb-2 drop-shadow-[0_0_8px_hsl(var(--primary-foreground)/0.5)]" />
            <span className="text-3xl font-display font-bold tracking-widest neon-text-white">SOS</span>
            <span className="text-[9px] font-semibold opacity-80 mt-1.5 tracking-wider">TAP FOR EMERGENCY</span>
          </button>

          <p className="mt-10 text-[11px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
            Press the button to send an instant emergency alert with your live location
          </p>
        </motion.div>
      </div>

      {/* Anonymous Report Box */}
      <div className="px-6 pb-24">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={() => navigate("/report")}
          className="w-full flex items-center gap-4 rounded-xl border border-primary/20 bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-neon active:scale-[0.98] neon-border-subtle"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
            <AlertTriangle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-display font-semibold text-foreground">Report Anonymous Complaint</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">File a secure report to police without revealing your identity</p>
          </div>
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
