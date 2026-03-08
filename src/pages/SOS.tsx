import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { Shield, MapPin, Mic, AlertTriangle, Wifi, WifiOff, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SOS = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background pb-24 pt-14">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-2xl font-bold text-foreground mb-2"
      >
        Emergency SOS
      </motion.h1>
      <p className="text-sm text-muted-foreground mb-2">Tap the button to activate</p>

      {/* Connection status */}
      <div className={`mb-6 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isOnline ? "bg-safe/10 text-safe" : "bg-warning/10 text-warning"}`}>
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? "Online — alerts via server" : "Offline — SMS fallback active"}
      </div>

      <SOSButton />

      {/* How SOS Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 w-full max-w-sm px-6"
      >
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">How SOS Works</h2>
        <div className="space-y-2">
          {[
            { icon: Shield, text: "5-second countdown before activation" },
            { icon: MapPin, text: "Live GPS location shared every 10s" },
            { icon: Mic, text: "Audio auto-records as evidence" },
            { icon: AlertTriangle, text: "Emergency contacts notified instantly" },
            { icon: Shield, text: "Police alerted after 2 minutes" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
              <item.icon className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-card-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Anonymous Report Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 w-full max-w-sm px-6 pb-28 relative z-10"
      >
        <button
          onClick={() => navigate("/report")}
          className="w-full rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-4 transition-all hover:bg-primary/20 hover:border-primary/50 active:scale-[0.98] neon-border cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Report Anonymous Complaint</p>
            <p className="text-[11px] text-muted-foreground">File a complaint to authorities securely</p>
          </div>
        </button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default SOS;
