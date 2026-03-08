import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const sosIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px #ef4444,0 0 24px #ef444480;animation:pulse 1.5s infinite"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const dangerIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px #f59e0b80"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Auto-fit map bounds to markers
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
};

const AuthorityMap = () => {
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [sosRes, repRes] = await Promise.all([
        supabase.from("sos_alerts").select("*").eq("status", "active"),
        supabase.from("safety_reports").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setSosAlerts(sosRes.data || []);
      setSafetyReports(repRes.data || []);
      setLoading(false);
    };
    fetchData();

    // Realtime SOS updates
    const channel = supabase
      .channel("map-sos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setSosAlerts(prev => [payload.new as any, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as any;
          if (updated.status === "active") {
            setSosAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
          } else {
            setSosAlerts(prev => prev.filter(a => a.id !== updated.id));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const allPositions: [number, number][] = [
    ...sosAlerts.filter(a => a.latitude).map(a => [a.latitude, a.longitude] as [number, number]),
    ...safetyReports.filter(r => r.latitude).map(r => [r.latitude, r.longitude] as [number, number]),
  ];

  // Default center: India
  const center: [number, number] = allPositions.length > 0
    ? allPositions[0]
    : [20.5937, 78.9629];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent" />
        Live Emergency Map
        {sosAlerts.length > 0 && (
          <Badge variant="destructive" className="animate-pulse ml-2">{sosAlerts.length} LIVE</Badge>
        )}
      </h2>

      {/* Interactive Map */}
      <div className="overflow-hidden rounded-xl border border-border/30" style={{ height: 400 }}>
        <style>{`
          @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.7; } }
          .leaflet-container { background: hsl(220 25% 10%) !important; }
        `}</style>
        <MapContainer
          center={center}
          zoom={allPositions.length > 0 ? 12 : 5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {allPositions.length > 1 && <FitBounds positions={allPositions} />}

          {/* SOS Alert Markers */}
          {sosAlerts.filter(a => a.latitude).map((alert) => (
            <Marker key={alert.id} position={[alert.latitude, alert.longitude]} icon={sosIcon}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[160px]">
                  <p className="font-bold text-red-600">🚨 Active SOS Alert</p>
                  <p>User: {alert.user_id.slice(0, 8)}...</p>
                  <p>Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                  <p>Time: {format(new Date(alert.activated_at), "MMM d, HH:mm")}</p>
                  {alert.escalated_to_police && <p className="text-orange-600 font-semibold">⚠ Escalated to Police</p>}
                </div>
              </Popup>
              <Circle
                center={[alert.latitude, alert.longitude]}
                radius={500}
                pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1 }}
              />
            </Marker>
          ))}

          {/* Safety Report / Danger Zone Markers */}
          {safetyReports.filter(r => r.latitude).map((report) => (
            <Marker key={report.id} position={[report.latitude, report.longitude]} icon={dangerIcon}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[140px]">
                  <p className="font-bold text-amber-600">⚠ {report.report_type}</p>
                  {report.description && <p>{report.description}</p>}
                  <p>Reported: {format(new Date(report.created_at), "MMM d, HH:mm")}</p>
                </div>
              </Popup>
              <Circle
                center={[report.latitude, report.longitude]}
                radius={300}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.08, weight: 1 }}
              />
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Active SOS List */}
      {sosAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sos flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Live Tracking ({sosAlerts.length})
          </h3>
          {sosAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 rounded-lg border border-sos/20 bg-sos/5 p-3">
              <div className="h-3 w-3 rounded-full bg-sos animate-pulse" />
              <div className="flex-1 text-xs">
                <span className="font-medium text-foreground">User {alert.user_id.slice(0, 8)}</span>
                {alert.latitude && (
                  <span className="text-muted-foreground ml-2">
                    ({alert.latitude.toFixed(4)}, {alert.longitude?.toFixed(4)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(alert.activated_at), "HH:mm")}
              </div>
              <Badge variant="destructive" className="text-[9px] animate-pulse">LIVE</Badge>
            </div>
          ))}
        </div>
      )}

      {sosAlerts.length === 0 && safetyReports.length === 0 && (
        <div className="rounded-xl border border-border/30 p-6 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No active alerts or reports</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityMap;
