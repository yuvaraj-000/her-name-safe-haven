import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { MapPin, Mic, Video } from "lucide-react";

const SOS = () => {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background pb-24 pt-14">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-2xl font-bold text-foreground mb-2"
      >
        Emergency SOS
      </motion.h1>
      <p className="text-sm text-muted-foreground mb-10">Tap the button to activate</p>

      <SOSButton />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 grid grid-cols-3 gap-4 px-6 w-full max-w-sm"
      >
        {[
          { icon: MapPin, label: "Location", desc: "Auto-shared" },
          { icon: Mic, label: "Audio", desc: "Auto-record" },
          { icon: Video, label: "Video", desc: "Auto-record" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card">
            <item.icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-card-foreground">{item.label}</span>
            <span className="text-[10px] text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default SOS;
