import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, ShieldAlert, Radio, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const AuthorityMap = () => {
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [sosRes, repRes] = await Promise.all([
        supabase.from("sos_alerts").select("*").eq("status", "active"),
        supabase.from("safety_reports").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setSosAlerts(sosRes.data || []);
      setSafetyReports(repRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent" />
        Live Emergency Map
      </h2>

      {/* Map Placeholder */}
      <div className="relative overflow-hidden rounded-xl border border-border/30 h-64" style={{ background: "hsl(220 25% 10%)" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Radio className="mx-auto h-10 w-10 text-primary/30 animate-pulse" />
            <p className="mt-2 text-xs text-muted-foreground">Live Tracking Map</p>
            <p className="text-[10px] text-muted-foreground/50">Integrate with Leaflet/Mapbox for live GPS tracking</p>
          </div>
        </div>

        {/* Simulated location dots */}
        {sosAlerts.filter(a => a.latitude).map((alert) => (
          <div
            key={alert.id}
            className="absolute h-4 w-4 rounded-full bg-sos animate-pulse shadow-sos"
            style={{
              top: `${30 + Math.random() * 40}%`,
              left: `${20 + Math.random() * 60}%`,
            }}
            title={`SOS Alert - ${alert.user_id.slice(0, 8)}`}
          />
        ))}
      </div>

      {/* Active SOS Tracking */}
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
              <Badge variant="destructive" className="text-[9px] animate-pulse">LIVE</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zones */}
      {safetyReports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reported Danger Zones ({safetyReports.length})
          </h3>
          {safetyReports.slice(0, 10).map((report) => (
            <div key={report.id} className="rounded-lg border border-border/30 p-3" style={{ background: "hsl(220 25% 12%)" }}>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-3 w-3 text-warning" />
                <span className="font-medium text-foreground">{report.report_type}</span>
                <span className="text-muted-foreground">
                  ({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
                </span>
              </div>
              {report.description && <p className="mt-1 text-[10px] text-muted-foreground">{report.description}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityMap;
