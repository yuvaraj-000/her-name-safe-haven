import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ArrowDown, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusFlow = ["submitted", "investigating", "evidence_review", "resolved"];
const statusLabels: Record<string, string> = {
  submitted: "Received",
  investigating: "Under Investigation",
  evidence_review: "Evidence Verification",
  resolved: "Resolved",
};
const statusColors: Record<string, string> = {
  submitted: "text-primary bg-primary/10",
  investigating: "text-warning bg-warning/10",
  evidence_review: "text-accent bg-accent/10",
  resolved: "text-safe bg-safe/10",
};

const AuthorityCaseManagement = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCases = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });
      setCases(data || []);
      setLoading(false);
    };
    fetchCases();

    const channel = supabase
      .channel("cases-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCases(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setCases(prev => prev.map(c => c.id === (payload.new as any).id ? payload.new as any : c));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.functions.invoke("authority-update", {
      body: { action: "update_case_status", id, data: { status: newStatus } },
    });

    if (!error) {
      setCases(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      toast({ title: "Status Updated", description: `Case moved to: ${statusLabels[newStatus]}` });
    } else {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const getNextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const priorityOrder = (c: any) => {
    const tMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return tMap[c.threat_level || "medium"] ?? 1;
  };

  const sorted = [...cases].sort((a, b) => priorityOrder(a) - priorityOrder(b));

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-accent" />
        Case Management
      </h2>

      {/* Status Pipeline */}
      <div className="flex items-center justify-between rounded-xl border border-border/30 p-3" style={{ background: "hsl(220 25% 12%)" }}>
        {statusFlow.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className="text-center">
              <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${statusColors[s]}`}>
                {cases.filter(c => c.status === s).length}
              </div>
              <span className="text-[9px] text-muted-foreground">{statusLabels[s].split(" ")[0]}</span>
            </div>
            {i < statusFlow.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground/30 rotate-[-90deg] mx-1" />}
          </div>
        ))}
      </div>

      {sorted.map((c, i) => {
        const next = getNextStatus(c.status);
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-xl border p-4 space-y-3 ${c.threat_level === "high" ? "border-sos/30" : "border-border/30"}`}
            style={{ background: "hsl(220 25% 12%)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <span className="text-primary font-mono font-bold">{c.case_id || "Case #" + c.id.slice(0, 8)}</span> • {format(new Date(c.created_at), "MMM d, yyyy")}
                  {c.is_anonymous && " • 🛡️ Anonymous"}
                </p>
              </div>
              <div className="flex gap-1">
                {c.threat_level === "high" && (
                  <Badge variant="destructive" className="text-[9px]">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> HIGH
                  </Badge>
                )}
                <Badge className={`text-[9px] ${statusColors[c.status] || "text-muted-foreground bg-secondary/30"}`}>
                  {statusLabels[c.status] || c.status}
                </Badge>
              </div>
            </div>

            {next && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] border-primary/30 text-primary hover:bg-primary/10 w-full"
                onClick={() => updateStatus(c.id, next)}
              >
                Move to: {statusLabels[next]}
              </Button>
            )}

            {c.status === "resolved" && (
              <div className="flex items-center gap-1 text-xs text-safe">
                <CheckCircle className="h-3 w-3" />
                Case Resolved
              </div>
            )}
          </motion.div>
        );
      })}

      {cases.length === 0 && (
        <div className="rounded-xl border border-border/30 p-8 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No cases to manage</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityCaseManagement;
