import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, MapPin, Clock, User, AlertTriangle, CheckCircle, Navigation, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const sosIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const AuthoritySOSAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapAlert, setMapAlert] = useState<{ lat: number; lng: number; userId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("sos_alerts")
        .select("*")
        .order("activated_at", { ascending: false });
      setAlerts(data || []);
      setLoading(false);
    };
    fetchAlerts();

    // Realtime subscription for new SOS alerts
    const channel = supabase
      .channel("sos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAlerts(prev => [payload.new as any, ...prev]);
            toast({ title: "🚨 New SOS Alert!", description: "A new emergency alert has been activated.", variant: "destructive" });
          } else if (payload.eventType === "UPDATE") {
            setAlerts(prev => prev.map(a => a.id === (payload.new as any).id ? payload.new as any : a));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const resolveAlert = async (id: string) => {
    const { error } = await supabase.functions.invoke("authority-update", {
      body: { action: "resolve_sos", id },
    });
    if (!error) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved", resolved_at: new Date().toISOString() } : a));
      toast({ title: "Alert Resolved", description: "SOS alert has been marked as resolved." });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const activeAlerts = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status !== "active");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-sos" />
        SOS Emergency Alerts
        {activeAlerts.length > 0 && (
          <Badge variant="destructive" className="animate-pulse ml-2">{activeAlerts.length} ACTIVE</Badge>
        )}
      </h2>

      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sos">🔴 Active Emergencies</h3>
          {activeAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-sos/30 bg-sos/5 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="destructive" className="animate-pulse">ACTIVE</Badge>
                <span className="text-[10px] text-muted-foreground">{format(new Date(alert.activated_at), "MMM d, HH:mm")}</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>User ID: {alert.user_id.slice(0, 8)}...</span>
                </div>
                {alert.latitude && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Location: {alert.latitude.toFixed(4)}, {alert.longitude?.toFixed(4)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Activated: {format(new Date(alert.activated_at), "PPpp")}</span>
                </div>
              </div>
              {alert.escalated_to_police && (
                <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Escalated to Police
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {alert.latitude && alert.longitude && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setMapAlert({ lat: alert.latitude, lng: alert.longitude, userId: alert.user_id })}
                  >
                    <Navigation className="h-3 w-3 mr-1" /> Open Location
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs border-safe/30 text-safe hover:bg-safe/10"
                  onClick={() => resolveAlert(alert.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Mark as Resolved
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolved Alerts ({resolvedAlerts.length})</h3>
          {resolvedAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border/30 p-4" style={{ background: "hsl(220 25% 12%)" }}>
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary">Resolved</Badge>
                <span className="text-[10px] text-muted-foreground">{format(new Date(alert.activated_at), "MMM d, HH:mm")}</span>
              </div>
              <p className="text-xs text-muted-foreground">User: {alert.user_id.slice(0, 8)}...</p>
              {alert.resolved_at && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">Resolved: {format(new Date(alert.resolved_at), "PPpp")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="rounded-xl border border-border/30 p-8 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No SOS alerts recorded</p>
        </div>
      )}

      {/* In-app Location Map Modal */}
      <AnimatePresence>
        {mapAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setMapAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border border-primary/30 bg-card overflow-hidden neon-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Victim Location</span>
                  <span className="text-[10px] text-muted-foreground">
                    {mapAlert.lat.toFixed(4)}, {mapAlert.lng.toFixed(4)}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMapAlert(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[350px]">
                <MapContainer
                  center={[mapAlert.lat, mapAlert.lng]}
                  zoom={16}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[mapAlert.lat, mapAlert.lng]} icon={sosIcon}>
                    <Popup>
                      <strong className="text-red-600">🚨 SOS Location</strong><br />
                      User: {mapAlert.userId.slice(0, 8)}...
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthoritySOSAlerts;
