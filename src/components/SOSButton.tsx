import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useSOS } from "@/contexts/SOSContext";

const SOSButton = () => {
  const { active, startCountdown } = useSOS();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4">
      <div className="relative">
        {active && (
          <>
            <span className="absolute inset-0 rounded-full bg-sos/20 animate-ripple" />
            <span className="absolute inset-0 rounded-full bg-sos/15 animate-ripple" style={{ animationDelay: "0.5s" }} />
            <span className="absolute inset-0 rounded-full bg-sos/10 animate-ripple" style={{ animationDelay: "1s" }} />
          </>
        )}
        <motion.button
          onClick={startCountdown}
          whileTap={{ scale: 0.95 }}
          className={`relative z-10 flex h-40 w-40 items-center justify-center rounded-full font-display text-2xl font-bold tracking-wider transition-all duration-300 ${
            active
              ? "bg-sos text-sos-foreground animate-sos-pulse shadow-sos"
              : "bg-gradient-to-br from-primary to-sos text-primary-foreground shadow-soft"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <ShieldAlert className="h-10 w-10" />
            <span>{active ? "ACTIVE" : "SOS"}</span>
          </div>
        </motion.button>
      </div>

      {!active && (
        <p className="text-sm text-muted-foreground text-center max-w-[250px]">
          Press to activate emergency SOS immediately.
        </p>
      )}
    </div>
  );
};

export default SOSButton;
