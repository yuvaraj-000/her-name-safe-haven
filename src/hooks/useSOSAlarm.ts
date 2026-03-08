import { useRef, useCallback } from "react";

export function useSOSAlarm() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = 0.8; // Loud
      gain.connect(ctx.destination);
      gainRef.current = gain;

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start();
      oscillatorRef.current = osc;

      // Beep pattern: alternate between high and low frequency
      let high = true;
      intervalRef.current = setInterval(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.frequency.value = high ? 1200 : 800;
          high = !high;
        }
      }, 400);
    } catch (err) {
      console.warn("Alarm not available:", err);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch {}
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    gainRef.current = null;
  }, []);

  return { startAlarm, stopAlarm };
}
