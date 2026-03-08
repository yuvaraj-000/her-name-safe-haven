import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { Shield, MapPin, Mic, Video, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";

const SOS = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

      {/* How it works */}
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

      <BottomNav />
    </div>
  );
};

export default SOS;
