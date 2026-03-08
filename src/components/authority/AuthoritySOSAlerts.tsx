import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, MapPin, Clock, User, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const AuthoritySOSAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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
            </motion.div>
          ))}
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolved Alerts</h3>
          {resolvedAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border/30 p-4" style={{ background: "hsl(220 25% 12%)" }}>
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary">Resolved</Badge>
                <span className="text-[10px] text-muted-foreground">{format(new Date(alert.activated_at), "MMM d, HH:mm")}</span>
              </div>
              <p className="text-xs text-muted-foreground">User: {alert.user_id.slice(0, 8)}...</p>
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
    </motion.div>
  );
};

export default AuthoritySOSAlerts;
