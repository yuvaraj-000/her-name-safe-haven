import { useEffect, useRef, useCallback } from "react";

interface ShakeOptions {
  threshold?: number;
  shakeCount?: number;
  timeWindow?: number;
  cooldown?: number;
  onShake: () => void;
}

export function useShakeDetection({
  threshold = 20,
  shakeCount = 3,
  timeWindow = 2000,
  cooldown = 3000,
  onShake,
}: ShakeOptions) {
  const shakesRef = useRef<number[]>([]);
  const lastTriggerRef = useRef(0);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const timeWindowRef = useRef(timeWindow);
  const thresholdRef = useRef(threshold);
  const onShakeRef = useRef(onShake);

  useEffect(() => { timeWindowRef.current = timeWindow; }, [timeWindow]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
  useEffect(() => { onShakeRef.current = onShake; }, [onShake]);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const last = lastAccelRef.current;
      const accelChange =
        Math.abs(acc.x! - last.x) +
        Math.abs(acc.y! - last.y) +
        Math.abs(acc.z! - last.z);

      lastAccelRef.current = { x: acc.x!, y: acc.y!, z: acc.z! };

      if (accelChange > thresholdRef.current) {
        const now = Date.now();

        if (now - lastTriggerRef.current < cooldown) return;

        shakesRef.current.push(now);
        shakesRef.current = shakesRef.current.filter(
          (t) => now - t < timeWindowRef.current
        );

        if (shakesRef.current.length >= shakeCount) {
          shakesRef.current = [];
          lastTriggerRef.current = now;
          onShakeRef.current();
        }
      }
    },
    [shakeCount, cooldown]
  );

  useEffect(() => {
    const requestAndListen = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
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
