import { createContext, useContext, ReactNode } from "react";
import { useSOSEmergency } from "@/hooks/useSOSEmergency";
import { useSOSAlarm } from "@/hooks/useSOSAlarm";
import { useEffect } from "react";

interface SOSContextType {
  active: boolean;
  countdown: number | null;
  contactsNotified: number;
  escalatedToPolice: boolean;
  isRecording: boolean;
  elapsedSeconds: number;
  latitude: number | null;
  longitude: number | null;
  startCountdown: () => void;
  cancelCountdown: () => void;
  cancelSOS: () => void;
}

const SOSContext = createContext<SOSContextType | null>(null);

export const useSOS = () => {
  const ctx = useContext(SOSContext);
  if (!ctx) throw new Error("useSOS must be used within SOSProvider");
  return ctx;
};

export const SOSProvider = ({ children }: { children: ReactNode }) => {
  const sos = useSOSEmergency();
  const { startAlarm, stopAlarm } = useSOSAlarm();

  // Expose startAlarm so it can be called immediately
  const originalStartCountdown = sos.startCountdown;
  const wrappedStartCountdown = () => {
    if (!sos.active) {
      startAlarm(); // Ring immediately, don't wait for async
    }
    originalStartCountdown();
  };

  // Stop alarm when SOS is cancelled
  useEffect(() => {
    if (!sos.active) {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [sos.active]);

  return (
    <SOSContext.Provider value={{ ...sos, startCountdown: wrappedStartCountdown }}>
      {children}
    </SOSContext.Provider>
  );
};
