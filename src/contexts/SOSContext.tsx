import { createContext, useContext, ReactNode, useCallback } from "react";
import { useSOSEmergency } from "@/hooks/useSOSEmergency";
import { useSOSAlarm } from "@/hooks/useSOSAlarm";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const sos = useSOSEmergency();
  const { startAlarm, stopAlarm, resumeAlarm } = useSOSAlarm();

  const originalStartCountdown = sos.startCountdown;
  const wrappedStartCountdown = useCallback(() => {
    if (!sos.active) {
      startAlarm();
    }
    originalStartCountdown();
  }, [sos.active, originalStartCountdown, startAlarm]);

  // Shake detection: activate SOS on 3-4 fast shakes
  useShakeDetection({
    threshold: 25,
    shakeCount: 3,
    timeWindow: 1500,
    cooldown: 5000,
    onShake: useCallback(() => {
      if (user && !sos.active) {
        wrappedStartCountdown();
      }
    }, [user, sos.active, wrappedStartCountdown]),
  });

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
