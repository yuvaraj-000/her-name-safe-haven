import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, ShieldAlert, Clock, Navigation, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
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

const policeIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:2px solid #fff;border-radius:4px;box-shadow:0 0 8px #3b82f680;display:flex;align-items:center;justify-content:center;font-size:10px">🏛</div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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

// Nearby police stations (Overpass API)
const useNearbyPoliceStations = (lat: number | null, lng: number | null) => {
  const [stations, setStations] = useState<{ name: string; lat: number; lng: number }[]>([]);

  useEffect(() => {
    if (!lat || !lng) return;
    const fetchStations = async () => {
      try {
        const query = `[out:json][timeout:10];node["amenity"="police"](around:5000,${lat},${lng});out body 10;`;
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        setStations(
          (data.elements || []).map((el: any) => ({
            name: el.tags?.name || "Police Station",
            lat: el.lat,
            lng: el.lon,
          }))
        );
      } catch {
        // Silently fail — stations are supplementary
      }
    };
    fetchStations();
  }, [lat, lng]);

  return stations;
};

const AuthorityMap = () => {
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [locationPaths, setLocationPaths] = useState<Record<string, [number, number][]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  // Get first active alert's location for police station search
  const firstActive = sosAlerts.find(a => a.latitude);
  const policeStations = useNearbyPoliceStations(
    firstActive?.latitude || null,
    firstActive?.longitude || null
  );

  useEffect(() => {
    const fetchData = async () => {
      const [sosRes, repRes] = await Promise.all([
        supabase.from("sos_alerts").select("*").eq("status", "active"),
        supabase.from("safety_reports").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const alerts = sosRes.data || [];
      setSosAlerts(alerts);
      setSafetyReports(repRes.data || []);

      // Fetch location history for all active alerts
      if (alerts.length > 0) {
        const alertIds = alerts.map(a => a.id);
        const { data: historyData } = await supabase
          .from("sos_location_history")
          .select("alert_id, latitude, longitude, recorded_at")
          .in("alert_id", alertIds)
          .order("recorded_at", { ascending: true });

        const paths: Record<string, [number, number][]> = {};
        (historyData || []).forEach((h: any) => {
          if (!paths[h.alert_id]) paths[h.alert_id] = [];
          paths[h.alert_id].push([h.latitude, h.longitude]);
        });
        setLocationPaths(paths);
      }

      setLoading(false);
    };
    fetchData();

    // Realtime SOS updates
    const sosChannel = supabase
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
            setLocationPaths(prev => {
              const next = { ...prev };
              delete next[updated.id];
              return next;
            });
          }
        }
      })
      .subscribe();

    // Realtime location history updates
    const locChannel = supabase
      .channel("map-location-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_location_history" }, (payload) => {
        const loc = payload.new as any;
        setLocationPaths(prev => ({
          ...prev,
          [loc.alert_id]: [...(prev[loc.alert_id] || []), [loc.latitude, loc.longitude]],
        }));
        // Also update the alert's current position
        setSosAlerts(prev =>
          prev.map(a => a.id === loc.alert_id ? { ...a, latitude: loc.latitude, longitude: loc.longitude } : a)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sosChannel);
      supabase.removeChannel(locChannel);
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const allPositions: [number, number][] = [
    ...sosAlerts.filter(a => a.latitude).map(a => [a.latitude, a.longitude] as [number, number]),
    ...safetyReports.filter(r => r.latitude).map(r => [r.latitude, r.longitude] as [number, number]),
  ];

  const center: [number, number] = allPositions.length > 0 ? allPositions[0] : [20.5937, 78.9629];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent" />
        Live Emergency Map
        {sosAlerts.length > 0 && (
          <Badge variant="destructive" className="animate-pulse ml-2">{sosAlerts.length} LIVE</Badge>
        )}
      </h2>

      {/* Map Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sos animate-pulse" /> SOS Alert</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Danger Zone</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Police Station</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-4 rounded bg-sos/60" /> Movement Path</span>
      </div>

      {/* Interactive Map */}
      <div className="overflow-hidden rounded-xl border border-border/30" style={{ height: 420 }}>
        <style>{`
          @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.7; } }
          .leaflet-container { background: hsl(220 25% 10%) !important; }
        `}</style>
        <MapContainer center={center} zoom={allPositions.length > 0 ? 12 : 5} style={{ height: "100%", width: "100%" }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {allPositions.length > 1 && <FitBounds positions={allPositions} />}

          {/* Movement Path Polylines */}
          {Object.entries(locationPaths).map(([alertId, path]) =>
            path.length > 1 ? (
              <Polyline
                key={`path-${alertId}`}
                positions={path}
                pathOptions={{ color: "#ef4444", weight: 3, opacity: 0.7, dashArray: "6, 8" }}
              />
            ) : null
          )}

          {/* SOS Alert Markers */}
          {sosAlerts.filter(a => a.latitude).map((alert) => (
            <Marker key={alert.id} position={[alert.latitude, alert.longitude]} icon={sosIcon}
              eventHandlers={{ click: () => setSelectedAlert(alert.id) }}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <p className="font-bold text-red-600">🚨 Active SOS Alert</p>
                  <p>User: {alert.user_id.slice(0, 8)}...</p>
                  <p>📍 {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</p>
                  <p>🕐 {format(new Date(alert.activated_at), "MMM d, HH:mm:ss")}</p>
                  {locationPaths[alert.id] && (
                    <p className="text-blue-500">📊 {locationPaths[alert.id].length} location points tracked</p>
                  )}
                  {alert.escalated_to_police && <p className="text-orange-600 font-semibold">⚠ Escalated to Police</p>}
                </div>
              </Popup>
              <Circle center={[alert.latitude, alert.longitude]} radius={500}
                pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1 }} />
            </Marker>
          ))}

          {/* Nearby Police Stations */}
          {policeStations.map((station, i) => (
            <Marker key={`police-${i}`} position={[station.lat, station.lng]} icon={policeIcon}>
              <Popup>
                <div className="text-xs min-w-[120px]">
                  <p className="font-bold text-blue-600">🏛 {station.name}</p>
                  <p>{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</p>
                </div>
              </Popup>
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
              <Circle center={[report.latitude, report.longitude]} radius={300}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.08, weight: 1 }} />
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Active SOS Live Tracking Panel */}
      {sosAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sos flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Live Tracking ({sosAlerts.length})
          </h3>
          {sosAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                selectedAlert === alert.id ? "border-sos/50 bg-sos/10" : "border-sos/20 bg-sos/5 hover:bg-sos/8"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-sos animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">User {alert.user_id.slice(0, 8)}</span>
                  {alert.latitude && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      📍 {alert.latitude.toFixed(5)}, {alert.longitude?.toFixed(5)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(alert.activated_at), "HH:mm")}
                  </div>
                  {locationPaths[alert.id] && (
                    <p className="text-[9px] text-muted-foreground/60">
                      <Navigation className="inline h-2.5 w-2.5 mr-0.5" />
                      {locationPaths[alert.id].length} pts
                    </p>
                  )}
                </div>
                <Badge variant="destructive" className="text-[9px] animate-pulse shrink-0">LIVE</Badge>
              </div>
              {alert.escalated_to_police && (
                <p className="mt-1 text-[10px] text-warning flex items-center gap-1">
                  ⚠ Escalated to police
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nearby Police Stations Panel */}
      {policeStations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Nearby Police Stations ({policeStations.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {policeStations.map((station, i) => (
              <div key={i} className="rounded-lg border border-border/30 p-2.5" style={{ background: "hsl(220 25% 12%)" }}>
                <p className="text-xs font-medium text-foreground truncate">{station.name}</p>
                <p className="text-[10px] text-muted-foreground">{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</p>
              </div>
            ))}
          </div>
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
