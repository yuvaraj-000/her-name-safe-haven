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

  const getSupportedMimeType = () => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };

  const saveRecording = async (chunks: Blob[], mimeType: string, source: string) => {
    const currentUser = userRef.current;
    if (chunks.length === 0 || !currentUser) return;

    const isVideo = mimeType.startsWith("video");
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunks, { type: mimeType });
    const fileName = `sos-${isVideo ? "video" : "audio"}-${Date.now()}.${ext}`;
    const filePath = `${currentUser.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, blob, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) {
        console.error("Evidence upload failed:", uploadError);
        toast({ title: "Upload Failed", description: "Could not save recording. Will retry.", variant: "destructive" });
        return;
      }

      const { error: dbError } = await supabase.from("evidence").insert({
        user_id: currentUser.id,
        file_name: fileName,
        file_path: filePath,
        file_type: mimeType,
        file_size: blob.size,
        source,
      });
      if (dbError) console.error("Evidence DB insert failed:", dbError);
      else toast({ title: "📹 Recording Saved", description: "SOS recording stored in Evidence Vault." });
    } catch (err) {
      console.error("Save recording error:", err);
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, recorderOptions);
      const localChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Wait a tick to ensure final dataavailable fires
        await new Promise((r) => setTimeout(r, 100));
        stream.getTracks().forEach((t) => t.stop());
        setState((s) => ({ ...s, videoStream: null, isRecording: false }));
        await saveRecording(localChunks, recorder.mimeType || "video/webm", "sos_video_recording");
      };

      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        stream.getTracks().forEach((t) => t.stop());
        setState((s) => ({ ...s, videoStream: null, isRecording: false }));
      };

      // Use 2s timeslice for more reliable chunk delivery on mobile
      recorder.start(2000);
      mediaRecorderRef.current = recorder;
      chunksRef.current = localChunks as any;
      setState((s) => ({ ...s, isRecording: true, videoStream: stream }));
    } catch (err) {
      console.warn("Video not available, trying audio-only:", err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(audioStream);
        const localChunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) localChunks.push(e.data);
        };

        recorder.onstop = async () => {
          await new Promise((r) => setTimeout(r, 100));
          audioStream.getTracks().forEach((t) => t.stop());
          setState((s) => ({ ...s, isRecording: false }));
          await saveRecording(localChunks, "audio/webm", "sos_recording");
        };

        recorder.onerror = (e) => {
          console.error("Audio recorder error:", e);
          audioStream.getTracks().forEach((t) => t.stop());
          setState((s) => ({ ...s, isRecording: false }));
        };

        recorder.start(2000);
        mediaRecorderRef.current = recorder;
        setState((s) => ({ ...s, isRecording: true }));
      } catch (audioErr) {
        console.warn("Recording not available:", audioErr);
        toast({ title: "Camera/Mic Permission", description: "Camera and microphone access denied.", variant: "destructive" });
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
    // Fire both in-app notification and WhatsApp in parallel
    try {
      const [notifyResult, whatsappResult] = await Promise.allSettled([
        supabase.functions.invoke("sos-notify", {
          body: {
            user_id: user?.id,
            alert_id: alertId,
            latitude: lat,
            longitude: lng,
            action: "notify_contacts",
          },
        }),
        supabase.functions.invoke("sos-whatsapp", {
          body: {
            user_id: user?.id,
            alert_id: alertId,
            latitude: lat,
            longitude: lng,
          },
        }),
      ]);

      let totalNotified = 0;
      let whatsappSent = 0;

      if (notifyResult.status === "fulfilled" && notifyResult.value.data?.contacts_notified) {
        totalNotified = notifyResult.value.data.contacts_notified;
      }

      if (whatsappResult.status === "fulfilled" && whatsappResult.value.data?.sent) {
        whatsappSent = whatsappResult.value.data.sent;
      }

      setState((s) => ({ ...s, contactsNotified: Math.max(totalNotified, whatsappSent) }));

      if (whatsappSent > 0) {
        toast({
          title: "📱 WhatsApp Alerts Sent",
          description: `${whatsappSent} emergency contact(s) notified via WhatsApp.`,
        });
      } else if (totalNotified > 0) {
        toast({
          title: "Contacts Alerted",
          description: `${totalNotified} emergency contact(s) notified.`,
        });
      } else if (whatsappResult.status === "fulfilled" && whatsappResult.value.data?.error) {
        toast({
          title: "WhatsApp Alert Failed",
          description: whatsappResult.value.data.error,
          variant: "destructive",
        });
      }

      if (whatsappResult.status === "rejected") {
        console.error("WhatsApp notification failed:", whatsappResult.reason);
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
    alertIdRef.current = alertId;
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

    // 2. Notify emergency contacts immediately
    await notifyContacts(alertId, lat, lng);

    // 3. Start video + audio recording without blocking alerts
    void startVideoRecording();

    // 4. Schedule police escalation after 2 minutes
    schedulePoliceEscalation(alertId, lat, lng);
  };

  const cancelSOS = async () => {
    // Stop recorder first (onstop will use alertIdRef to save video)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Small delay to let onstop fire and capture refs
    await new Promise((r) => setTimeout(r, 200));

    // Now stop other processes
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

    const currentAlertId = alertIdRef.current;
    if (currentAlertId && user) {
      await supabase
        .from("sos_alerts")
        .update({
          status: "cancelled",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", currentAlertId);
    }

    alertIdRef.current = null;

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
