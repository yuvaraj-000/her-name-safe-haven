import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Shield, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ReportDangerDialog from "@/components/safety-map/ReportDangerDialog";
import DangerZoneCard from "@/components/safety-map/DangerZoneCard";
import { toast } from "sonner";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const typeIconColors: Record<string, string> = {
  harassment: "#ef4444",
  unsafe_area: "#f59e0b",
  stalking: "#a855f7",
  theft: "#f97316",
  other: "#6b7280",
};

const makeIcon = (color: string, size: number) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px ${color}80"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
};

const UserLocationMarker = () => {
  const map = useMap();
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc: [number, number] = [p.coords.latitude, p.coords.longitude];
        setPos(loc);
        map.setView(loc, 14);
      },
      () => {}
    );
  }, [map]);

  if (!pos) return null;
  return (
    <Circle
      center={pos}
      radius={50}
      pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.3, weight: 2 }}
    />
  );
};

const typeLabels: Record<string, string> = {
  harassment: "🔴 Harassment",
  unsafe_area: "🟡 Unsafe Area",
  stalking: "🟣 Stalking",
  theft: "🟠 Theft",
  other: "⚪ Other",
};

const SafetyMap = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showList, setShowList] = useState(false);

  // Fetch active (non-expired) reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["safety-reports-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_reports")
        .select("*")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch user's upvotes
  const { data: userUpvotes = [] } = useQuery({
    queryKey: ["user-upvotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("safety_report_upvotes")
        .select("report_id")
        .eq("user_id", user!.id);
      return (data || []).map((u: any) => u.report_id);
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("safety-map-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_reports" }, () => {
        queryClient.invalidateQueries({ queryKey: ["safety-reports-active"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Proximity warning
  useEffect(() => {
    if (reports.length === 0) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const nearby = reports.filter((r: any) => {
        const dist = Math.sqrt(Math.pow(r.latitude - latitude, 2) + Math.pow(r.longitude - longitude, 2));
        return dist < 0.005; // ~500m
      });
      if (nearby.length > 0) {
        toast.warning(`⚠ You are near ${nearby.length} reported danger zone(s). Stay alert!`);
      }
    }, () => {});
  }, [reports]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["safety-reports-active"] });
    queryClient.invalidateQueries({ queryKey: ["user-upvotes"] });
  };

  const positions: [number, number][] = reports
    .filter((r: any) => r.latitude)
    .map((r: any) => [r.latitude, r.longitude]);

  // Compute heatmap opacity based on density
  const getHeatOpacity = (report: any) => {
    const nearby = reports.filter((r: any) => {
      const dist = Math.sqrt(Math.pow(r.latitude - report.latitude, 2) + Math.pow(r.longitude - report.longitude, 2));
      return dist < 0.003;
    });
    return Math.min(0.15 + nearby.length * 0.08, 0.5);
  };

  const center: [number, number] = positions.length > 0 ? positions[0] : [20.5937, 78.9629];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Safety Map</h1>
          <p className="text-xs text-muted-foreground">
            {reports.length} active danger zone{reports.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ReportDangerDialog onReported={invalidate} />
      </div>

      {/* Legend */}
      <div className="px-6 pb-3 flex flex-wrap gap-1.5">
        {Object.entries(typeLabels).map(([key, label]) => (
          <span key={key} className="text-[10px] bg-card rounded-full px-2 py-0.5 border border-border/30">
            {label}
          </span>
        ))}
        <span className="text-[10px] bg-card rounded-full px-2 py-0.5 border border-border/30 flex items-center gap-1">
          <Flame className="h-2.5 w-2.5 text-sos" /> Heatzone
        </span>
      </div>

      {/* Map */}
      <div className="px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-2xl border border-border/30" style={{ height: 360 }}>
          <style>{`.leaflet-container { background: hsl(220 25% 10%) !important; }`}</style>
          <MapContainer center={center} zoom={positions.length > 0 ? 13 : 5} style={{ height: "100%", width: "100%" }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <UserLocationMarker />
            {positions.length > 1 && <FitBounds positions={positions} />}

            {reports.map((r: any) => {
              const color = typeIconColors[r.report_type] || "#6b7280";
              const upvoteScale = Math.min(14 + r.upvotes * 2, 24);
              return (
                <Marker key={r.id} position={[r.latitude, r.longitude]} icon={makeIcon(color, upvoteScale)}>
                  <Popup>
                    <div className="text-xs space-y-1 min-w-[160px]">
                      <p className="font-bold" style={{ color }}>
                        {typeLabels[r.report_type] || r.report_type}
                      </p>
                      {r.description && <p>{r.description}</p>}
                      <p>👍 {r.upvotes} upvotes</p>
                      <p className="text-gray-500">Expires: {new Date(r.expires_at).toLocaleString()}</p>
                    </div>
                  </Popup>
                  {/* Heatmap-style circle */}
                  <Circle
                    center={[r.latitude, r.longitude]}
                    radius={200 + r.upvotes * 50}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: getHeatOpacity(r),
                      weight: 1,
                    }}
                  />
                </Marker>
              );
            })}
          </MapContainer>
        </motion.div>
      </div>

      {/* Toggle list */}
      <div className="px-6 pt-4">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowList(!showList)}>
          <AlertTriangle className="h-4 w-4" />
          {showList ? "Hide Reports" : `View Reports (${reports.length})`}
        </Button>
      </div>

      {/* Reports list */}
      {showList && (
        <div className="px-6 pt-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No active danger zones. Stay safe!</p>
            </div>
          ) : (
            reports.map((r: any) => (
              <DangerZoneCard
                key={r.id}
                report={r}
                hasUpvoted={userUpvotes.includes(r.id)}
                onUpvoted={invalidate}
              />
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SafetyMap;
