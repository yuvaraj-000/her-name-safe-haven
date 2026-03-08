import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const sosIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to recenter map when position changes
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface SOSLocationMapProps {
  alertId: string;
  initialLat: number;
  initialLng: number;
  userId: string;
  onClose: () => void;
}

export default function SOSLocationMap({ alertId, initialLat, initialLng, userId, onClose }: SOSLocationMapProps) {
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [path, setPath] = useState<[number, number][]>([[initialLat, initialLng]]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Fetch existing location history
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("sos_location_history")
        .select("latitude, longitude, recorded_at")
        .eq("alert_id", alertId)
        .order("recorded_at", { ascending: true });

      if (data && data.length > 0) {
        const points: [number, number][] = data.map(d => [d.latitude, d.longitude]);
        setPath(points);
        const last = data[data.length - 1];
        setCurrentLat(last.latitude);
        setCurrentLng(last.longitude);
      }
    };
    fetchHistory();

    // Realtime: listen for new location updates
    const channel = supabase
      .channel(`sos-location-${alertId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_location_history", filter: `alert_id=eq.${alertId}` },
        (payload) => {
          const loc = payload.new as any;
          setCurrentLat(loc.latitude);
          setCurrentLng(loc.longitude);
          setPath(prev => [...prev, [loc.latitude, loc.longitude]]);
        }
      )
      .subscribe();

    // Also listen for sos_alerts table updates (location field updates)
    const alertChannel = supabase
      .channel(`sos-alert-loc-${alertId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sos_alerts", filter: `id=eq.${alertId}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.latitude && updated.longitude) {
            setCurrentLat(updated.latitude);
            setCurrentLng(updated.longitude);
          }
        }
      )
      .subscribe();

    // Polling fallback every 5s
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("sos_alerts")
        .select("latitude, longitude")
        .eq("id", alertId)
        .single();
      if (data?.latitude && data?.longitude) {
        setCurrentLat(data.latitude);
        setCurrentLng(data.longitude);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(alertChannel);
      clearInterval(pollInterval);
    };
  }, [alertId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg rounded-xl border border-sos/40 bg-card overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-sos/5">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-sos" />
            <span className="text-sm font-bold text-foreground">Live Victim Tracking</span>
            <Badge variant="destructive" className="animate-pulse text-[10px] h-5">
              <Radio className="h-2.5 w-2.5 mr-1" /> LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">
              {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="h-[400px]">
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={currentLat} lng={currentLng} />
            <Marker position={[currentLat, currentLng]} icon={sosIcon}>
              <Popup>
                <strong style={{ color: "#ef4444" }}>🚨 SOS - Live Location</strong><br />
                User: {userId.slice(0, 8)}...<br />
                Coords: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
              </Popup>
            </Marker>
            {path.length > 1 && (
              <Polyline
                positions={path}
                pathOptions={{ color: "#ef4444", weight: 3, opacity: 0.7, dashArray: "8 4" }}
              />
            )}
          </MapContainer>
        </div>

        {/* Footer info */}
        <div className="p-2 border-t border-border bg-sos/5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            📍 {path.length} location point{path.length !== 1 ? "s" : ""} tracked
          </span>
          <span className="text-[10px] text-muted-foreground">
            Updates every 10s
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
