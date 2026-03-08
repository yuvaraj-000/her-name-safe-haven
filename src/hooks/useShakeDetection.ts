import { useEffect, useRef, useCallback } from "react";

interface ShakeOptions {
  threshold?: number;       // Acceleration threshold to count as a shake
  shakeCount?: number;      // Number of shakes needed to trigger
  timeWindow?: number;      // Time window (ms) to complete all shakes
  cooldown?: number;        // Cooldown (ms) after triggering before it can trigger again
  onShake: () => void;
}

export function useShakeDetection({
  threshold = 25,
  shakeCount = 3,
  timeWindow = 1500,
  cooldown = 3000,
  onShake,
}: ShakeOptions) {
  const shakesRef = useRef<number[]>([]);
  const lastTriggerRef = useRef(0);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const last = lastAccelRef.current;
      const deltaX = Math.abs(acc.x - last.x);
      const deltaY = Math.abs(acc.y - last.y);
      const deltaZ = Math.abs(acc.z - last.z);
      const totalDelta = deltaX + deltaY + deltaZ;

      lastAccelRef.current = { x: acc.x, y: acc.y, z: acc.z };

      if (totalDelta > threshold) {
        const now = Date.now();

        // Cooldown check
        if (now - lastTriggerRef.current < cooldown) return;

        // Add this shake timestamp
        shakesRef.current.push(now);

        // Remove old shakes outside the time window
        shakesRef.current = shakesRef.current.filter(
          (t) => now - t < timeWindow
        );

        if (shakesRef.current.length >= shakeCount) {
          shakesRef.current = [];
          lastTriggerRef.current = now;
          onShake();
        }
      }
    },
    [threshold, shakeCount, timeWindow, cooldown, onShake]
  );

  useEffect(() => {
    // Request permission on iOS 13+
    const requestAndListen = async () => {
      if (
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== "granted") return;
        } catch {
          return;
        }
      }
      window.addEventListener("devicemotion", handleMotion);
    };

    requestAndListen();

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]);
}
