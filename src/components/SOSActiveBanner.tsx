import { useSOS } from "@/contexts/SOSContext";
import { ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const SOSActiveBanner = () => {
  const { active, elapsedSeconds, cancelSOS } = useSOS();

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-sos text-sos-foreground px-4 py-3 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-bold">SOS ACTIVE</span>
            <span className="text-xs font-mono opacity-80">{formatTime(elapsedSeconds)}</span>
          </div>
          <button
            onClick={cancelSOS}
            className="flex items-center gap-1 rounded-full bg-sos-foreground/20 px-3 py-1 text-xs font-semibold hover:bg-sos-foreground/30 transition-colors"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SOSActiveBanner;
