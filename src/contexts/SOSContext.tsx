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
  videoStream: MediaStream | null;
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
  const { startAlarm, stopAlarm, resumeAlarm } = useSOSAlarm();

  const originalStartCountdown = sos.startCountdown;
  const wrappedStartCountdown = () => {
    if (!sos.active) {
      startAlarm();
    }
    originalStartCountdown();
  };

  // When camera recording starts, resume alarm in case getUserMedia suspended it
  useEffect(() => {
    if (sos.isRecording && sos.active) {
      // Small delay to let getUserMedia settle, then force resume
      const timer = setTimeout(() => resumeAlarm(), 500);
      return () => clearTimeout(timer);
    }
  }, [sos.isRecording, sos.active]);

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
