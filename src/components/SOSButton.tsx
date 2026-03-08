import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Mic, MapPin, Radio, Clock } from "lucide-react";
import { useSOSEmergency } from "@/hooks/useSOSEmergency";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const SOSButton = () => {
  const {
    active,
    countdown,
    contactsNotified,
    escalatedToPolice,
    isRecording,
    elapsedSeconds,
    latitude,
    longitude,
    startCountdown,
    cancelCountdown,
    cancelSOS,
  } = useSOSEmergency();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4">
      {/* Main SOS Button */}
      <div className="relative">
        {active && (
          <>
            <span className="absolute inset-0 rounded-full bg-sos/20 animate-ripple" />
            <span className="absolute inset-0 rounded-full bg-sos/15 animate-ripple" style={{ animationDelay: "0.5s" }} />
            <span className="absolute inset-0 rounded-full bg-sos/10 animate-ripple" style={{ animationDelay: "1s" }} />
          </>
        )}
        <motion.button
          onClick={active ? cancelSOS : countdown !== null ? cancelCountdown : startCountdown}
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
              <span className="text-xs font-mono opacity-80">{formatTime(elapsedSeconds)}</span>
            </div>
          ) : countdown !== null ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-bold">{countdown}</span>
              <span className="text-xs opacity-80">Tap to cancel</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="h-10 w-10" />
              <span>SOS</span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Live Status Panel */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full space-y-3"
          >
            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 rounded-lg p-3 ${latitude ? "bg-safe/10" : "bg-warning/10"}`}>
                <MapPin className={`h-4 w-4 ${latitude ? "text-safe" : "text-warning"}`} />
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Location</p>
                  <p className="text-[10px] text-muted-foreground">
                    {latitude ? "Tracking live" : "Acquiring..."}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-2 rounded-lg p-3 ${isRecording ? "bg-sos/10" : "bg-muted"}`}>
                <Mic className={`h-4 w-4 ${isRecording ? "text-sos animate-pulse" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Audio</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isRecording ? "Recording" : "Unavailable"}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-2 rounded-lg p-3 ${contactsNotified > 0 ? "bg-safe/10" : "bg-warning/10"}`}>
                <Radio className={`h-4 w-4 ${contactsNotified > 0 ? "text-safe" : "text-warning animate-pulse"}`} />
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Contacts</p>
                  <p className="text-[10px] text-muted-foreground">
                    {contactsNotified > 0 ? `${contactsNotified} alerted` : "Notifying..."}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-2 rounded-lg p-3 ${escalatedToPolice ? "bg-sos/10" : "bg-muted"}`}>
                <Clock className={`h-4 w-4 ${escalatedToPolice ? "text-sos" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Police</p>
                  <p className="text-[10px] text-muted-foreground">
                    {escalatedToPolice
                      ? "🚨 Alerted"
                      : `In ${Math.max(0, 120 - elapsedSeconds)}s`}
                  </p>
                </div>
              </div>
            </div>

            {/* Location coordinates */}
            {latitude && longitude && (
              <div className="rounded-lg bg-card p-3 shadow-card">
                <p className="text-[10px] font-mono text-muted-foreground text-center">
                  📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            )}

            {/* Escalation warning */}
            {!escalatedToPolice && elapsedSeconds >= 90 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-warning/30 bg-warning/10 p-3"
              >
                <p className="text-xs text-warning text-center font-semibold">
                  ⚠️ Police will be alerted in {Math.max(0, 120 - elapsedSeconds)} seconds
                </p>
              </motion.div>
            )}

            {escalatedToPolice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-sos/30 bg-sos/10 p-3"
              >
                <p className="text-xs text-sos text-center font-semibold">
                  🚨 Police authorities have been notified and are tracking your location
                </p>
              </motion.div>
            )}

            {/* Cancel button */}
            <button
              onClick={cancelSOS}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" /> Cancel Emergency
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!active && countdown === null && (
        <p className="text-sm text-muted-foreground text-center max-w-[250px]">
          Press to activate emergency SOS. A 5-second countdown will begin before activation.
        </p>
      )}
    </div>
  );
};

export default SOSButton;
