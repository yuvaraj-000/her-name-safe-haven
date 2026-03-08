import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";

const SOSButton = () => {
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handlePress = useCallback(() => {
    if (active) {
      setActive(false);
      setCountdown(null);
      return;
    }
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setActive(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [active]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Ripple rings */}
        {active && (
          <>
            <span className="absolute inset-0 rounded-full bg-sos/20 animate-ripple" />
            <span className="absolute inset-0 rounded-full bg-sos/15 animate-ripple" style={{ animationDelay: "0.5s" }} />
            <span className="absolute inset-0 rounded-full bg-sos/10 animate-ripple" style={{ animationDelay: "1s" }} />
          </>
        )}
        <motion.button
          onClick={handlePress}
          whileTap={{ scale: 0.95 }}
          className={`relative z-10 flex h-40 w-40 items-center justify-center rounded-full font-display text-2xl font-bold tracking-wider transition-all duration-300 ${
            active
              ? "bg-sos text-sos-foreground animate-sos-pulse shadow-sos"
              : countdown !== null
              ? "bg-warning text-warning-foreground"
              : "bg-gradient-to-br from-primary to-sos text-primary-foreground shadow-soft"
          }`}
        >
          {active ? (
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="h-10 w-10" />
              <span className="text-sm">ACTIVE</span>
            </div>
          ) : countdown !== null ? (
            <span className="text-5xl font-bold">{countdown}</span>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="h-10 w-10" />
              <span>SOS</span>
            </div>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-sm text-muted-foreground text-center max-w-[250px]">
              Emergency alert sent to your trusted contacts. Location sharing active.
            </p>
            <button
              onClick={() => { setActive(false); setCountdown(null); }}
              className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" /> Cancel Emergency
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!active && countdown === null && (
        <p className="text-sm text-muted-foreground text-center max-w-[250px]">
          Press and hold to activate emergency SOS. A 3-second countdown will begin.
        </p>
      )}
    </div>
  );
};

export default SOSButton;
