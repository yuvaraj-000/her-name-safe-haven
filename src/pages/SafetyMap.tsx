import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const reportTypeColors: Record<string, string> = {
  harassment: "bg-sos/10 text-sos",
  unsafe_area: "bg-warning/10 text-warning",
  theft: "bg-accent/10 text-accent",
  stalking: "bg-primary/10 text-primary",
  other: "bg-muted text-muted-foreground",
};

const reportTypeLabels: Record<string, string> = {
  harassment: "Harassment",
  unsafe_area: "Unsafe Area",
  theft: "Theft",
  stalking: "Stalking",
  other: "Other",
};

const SafetyMap = () => {
  const { user } = useAuth();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["safety-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Safety Map</h1>
          <p className="text-sm text-muted-foreground">Community-reported zones</p>
        </div>
      </div>

      {/* Map placeholder */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mb-6 rounded-2xl bg-gradient-to-br from-secondary/5 to-primary/5 border border-border overflow-hidden"
        style={{ height: 240 }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <MapPin className="h-10 w-10 text-primary/40" />
          <p className="text-sm text-muted-foreground">Interactive map coming soon</p>
          <p className="text-xs text-muted-foreground">Reports are shown below</p>
        </div>
        {/* Decorative dots */}
        {reports.slice(0, 8).map((r, i) => (
          <div
            key={r.id}
            className={`absolute h-3 w-3 rounded-full ${r.report_type === 'harassment' ? 'bg-sos/60' : r.report_type === 'unsafe_area' ? 'bg-warning/60' : 'bg-primary/40'}`}
            style={{
              left: `${15 + (i * 11) % 70}%`,
              top: `${20 + (i * 17) % 60}%`,
            }}
          />
        ))}
      </motion.div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(reportTypeLabels).map(([key, label]) => (
          <span key={key} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${reportTypeColors[key]}`}>
            <AlertTriangle className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>

      {/* Reports list */}
      <h2 className="font-display text-lg font-semibold text-foreground mb-3">Recent Reports</h2>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No safety reports yet.<br />The community map will grow over time.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${reportTypeColors[r.report_type]}`}>
                    {reportTypeLabels[r.report_type]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.description && <p className="mt-2 text-sm text-card-foreground/80">{r.description}</p>}
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SafetyMap;
