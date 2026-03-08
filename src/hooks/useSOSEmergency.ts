import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const POLICE_ESCALATION_MS = 2 * 60 * 1000; // 2 minutes
const LOCATION_UPDATE_MS = 10 * 1000; // 10 seconds

interface SOSState {
  active: boolean;
  countdown: number | null;
  alertId: string | null;
  contactsNotified: number;
  escalatedToPolice: boolean;
  isRecording: boolean;
  elapsedSeconds: number;
  latitude: number | null;
  longitude: number | null;
  videoStream: MediaStream | null;
}

export function useSOSEmergency() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<SOSState>({
    active: false,
    countdown: null,
    alertId: null,
    contactsNotified: 0,
    escalatedToPolice: false,
    isRecording: false,
    elapsedSeconds: 0,
    latitude: null,
    longitude: null,
    videoStream: null,
  });

  const locationWatchRef = useRef<number | null>(null);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertIdRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllProcesses();
    };
  }, []);

  const stopAllProcesses = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (escalationTimerRef.current) {
      clearTimeout(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  const startVideoRecording = async () => {
    try {
      // Request both camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState((s) => ({ ...s, videoStream: null }));
        const currentUser = userRef.current;
        const currentAlertId = alertIdRef.current;
        if (chunksRef.current.length > 0 && currentUser) {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const fileName = `sos-video-${Date.now()}.webm`;
          const filePath = `${currentUser.id}/${fileName}`;

          await supabase.storage.from("evidence").upload(filePath, blob);
          await supabase.from("evidence").insert({
            user_id: currentUser.id,
            file_name: fileName,
            file_path: filePath,
            file_type: "video/webm",
            file_size: blob.size,
            source: "sos_video_recording",
          });
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState((s) => ({ ...s, isRecording: true, videoStream: stream }));
    } catch (err) {
      console.warn("Video recording not available, falling back to audio:", err);
      // Fallback to audio-only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(audioStream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          audioStream.getTracks().forEach((t) => t.stop());
          if (chunksRef.current.length > 0 && user && state.alertId) {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const fileName = `sos-audio-${Date.now()}.webm`;
            const filePath = `${user.id}/${fileName}`;
            await supabase.storage.from("evidence").upload(filePath, blob);
            await supabase.from("evidence").insert({
              user_id: user.id, file_name: fileName, file_path: filePath,
              file_type: "audio/webm", file_size: blob.size, source: "sos_recording",
            });
          }
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setState((s) => ({ ...s, isRecording: true }));
      } catch (audioErr) {
        console.warn("Recording not available:", audioErr);
        toast({ title: "Camera/Mic Permission", description: "Camera and microphone access denied. Recording skipped.", variant: "destructive" });
      }
    }
  };

  const startLocationTracking = (alertId: string) => {
    // Continuous GPS watch
    if ("geolocation" in navigator) {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setState((s) => ({
            ...s,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
        },
        (err) => console.warn("Location error:", err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

      // Send location updates to server every 10 seconds
      locationUpdateRef.current = setInterval(async () => {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            })
          );

          await supabase.functions.invoke("sos-notify", {
            body: {
              user_id: user?.id,
              alert_id: alertId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              action: "update_location",
            },
          });
        } catch {}
      }, LOCATION_UPDATE_MS);
    }
  };

  const notifyContacts = async (
    alertId: string,
    lat: number | null,
    lng: number | null
  ) => {
    try {
      const { data } = await supabase.functions.invoke("sos-notify", {
        body: {
          user_id: user?.id,
          alert_id: alertId,
          latitude: lat,
          longitude: lng,
          action: "notify_contacts",
        },
      });

      if (data?.contacts_notified) {
        setState((s) => ({ ...s, contactsNotified: data.contacts_notified }));
        toast({
          title: "Contacts Alerted",
          description: `${data.contacts_notified} emergency contact(s) notified.`,
        });
      }
    } catch (err) {
      console.error("Contact notification error:", err);
    }
  };

  const schedulePoliceEscalation = (
    alertId: string,
    lat: number | null,
    lng: number | null
  ) => {
    escalationTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("sos-notify", {
          body: {
            user_id: user?.id,
            alert_id: alertId,
            latitude: lat,
            longitude: lng,
            action: "escalate_police",
          },
        });

        if (data?.escalated) {
          setState((s) => ({ ...s, escalatedToPolice: true }));
          toast({
            title: "🚨 Police Alerted",
            description:
              "SOS active for 2+ minutes. Authorities have been notified.",
          });
        }
      } catch (err) {
        console.error("Police escalation error:", err);
      }
    }, POLICE_ESCALATION_MS);
  };

  const activateSOS = async () => {
    if (!user) return;

    // Get initial location
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {}

    // Create SOS alert in DB
    const { data } = await supabase
      .from("sos_alerts")
      .insert({
        user_id: user.id,
        status: "active",
        latitude: lat,
        longitude: lng,
      })
      .select()
      .single();

    if (!data) return;

    const alertId = data.id;

    setState((s) => ({
      ...s,
      active: true,
      alertId,
      latitude: lat,
      longitude: lng,
      elapsedSeconds: 0,
      contactsNotified: 0,
      escalatedToPolice: false,
    }));

    // Start elapsed timer
    elapsedRef.current = setInterval(() => {
      setState((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);

    // 1. Start live location tracking
    startLocationTracking(alertId);

    // 2. Start video + audio recording
    await startVideoRecording();

    // 3. Notify emergency contacts immediately
    await notifyContacts(alertId, lat, lng);

    // 4. Schedule police escalation after 2 minutes
    schedulePoliceEscalation(alertId, lat, lng);
  };

  const cancelSOS = async () => {
    stopAllProcesses();

    if (state.alertId && user) {
      await supabase
        .from("sos_alerts")
        .update({
          status: "cancelled",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", state.alertId);
    }

    setState({
      active: false,
      countdown: null,
      alertId: null,
      contactsNotified: 0,
      escalatedToPolice: false,
      isRecording: false,
      elapsedSeconds: 0,
      latitude: null,
      longitude: null,
      videoStream: null,
    });

    toast({ title: "SOS Cancelled", description: "Emergency alert deactivated." });
  };

  const startCountdown = useCallback(() => {
    if (state.active) {
      cancelSOS();
      return;
    }
    // Activate immediately — no countdown
    activateSOS();
  }, [state.active, user]);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState((s) => ({ ...s, countdown: null }));
  }, []);

  return {
    ...state,
    startCountdown,
    cancelCountdown,
    cancelSOS,
  };
}
