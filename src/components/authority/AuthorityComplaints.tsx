import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, MapPin, Clock, User, UserX, Sparkles, AlertTriangle,
  CheckCircle, ShieldCheck, ShieldX, ShieldAlert, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ComplaintCard from "./ComplaintCard";

const AuthorityComplaints = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [verifications, setVerifications] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchIncidents = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });
      setIncidents(data || []);
      setLoading(false);
    };
    fetchIncidents();

    const channel = supabase
      .channel("incidents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setIncidents(prev => [payload.new as any, ...prev]);
            toast({ title: "📋 New Report!", description: "A new incident report has been submitted." });
          } else if (payload.eventType === "UPDATE") {
            setIncidents(prev => prev.map(i => i.id === (payload.new as any).id ? payload.new as any : i));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const callAI = async (incident: any, type: "summarize" | "verify") => {
    const setProcessing = type === "summarize" ? setSummarizing : setVerifying;
    setProcessing(incident.id);

    try {
      const { data, error } = await supabase.functions.invoke("ai-summarize", {
        body: { incident: { ...incident, has_evidence: true }, type },
      });
      if (error) throw error;

      if (type === "summarize") {
        setSummaries(prev => ({ ...prev, [incident.id]: data.result }));
      } else {
        setVerifications(prev => ({ ...prev, [incident.id]: data.result }));
        const resultText = data.result.toUpperCase();
        let status = "needs_review";
        if (resultText.includes("STATUS: VERIFIED")) status = "verified";
        else if (resultText.includes("STATUS: SUSPICIOUS")) status = "suspicious";

        await supabase.from("incidents").update({
          verification_status: status,
          verification_result: data.result,
        }).eq("id", incident.id);

        setIncidents(prev =>
          prev.map(i => i.id === incident.id
            ? { ...i, verification_status: status, verification_result: data.result }
            : i
          )
        );
      }
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message || "Failed to process", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const filtered = incidents.filter(i => {
    if (filter === "high_priority") return i.priority_level === "high";
    if (filter === "medium_priority") return i.priority_level === "medium";
    if (filter === "low_priority") return i.priority_level === "low";
    if (filter === "anonymous") return i.is_anonymous;
    if (filter === "verified") return i.verification_status === "verified";
    if (filter === "suspicious") return i.verification_status === "suspicious";
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const highCount = incidents.filter(i => i.priority_level === "high").length;
  const mediumCount = incidents.filter(i => i.priority_level === "medium").length;
  const lowCount = incidents.filter(i => i.priority_level === "low").length;
  const suspiciousCount = incidents.filter(i => i.verification_status === "suspicious").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        AI-Screened Complaints
      </h2>

      {/* Priority Stats */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setFilter("high_priority")}
          className={`rounded-xl border p-3 text-center transition-all ${
            filter === "high_priority" ? "border-sos/50 bg-sos/10" : "border-border/30 bg-card"
          }`}
        >
          <Zap className="h-4 w-4 text-sos mx-auto mb-1" />
          <p className="text-lg font-bold text-sos">{highCount}</p>
          <p className="text-[10px] text-muted-foreground">HIGH</p>
        </button>
        <button
          onClick={() => setFilter("medium_priority")}
          className={`rounded-xl border p-3 text-center transition-all ${
            filter === "medium_priority" ? "border-warning/50 bg-warning/10" : "border-border/30 bg-card"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-warning mx-auto mb-1" />
          <p className="text-lg font-bold text-warning">{mediumCount}</p>
          <p className="text-[10px] text-muted-foreground">MEDIUM</p>
        </button>
        <button
          onClick={() => setFilter("low_priority")}
          className={`rounded-xl border p-3 text-center transition-all ${
            filter === "low_priority" ? "border-safe/50 bg-safe/10" : "border-border/30 bg-card"
          }`}
        >
          <CheckCircle className="h-4 w-4 text-safe mx-auto mb-1" />
          <p className="text-lg font-bold text-safe">{lowCount}</p>
          <p className="text-[10px] text-muted-foreground">LOW</p>
        </button>
      </div>

      {/* High priority alert */}
      {highCount > 0 && filter !== "high_priority" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-sos/30 bg-sos/10 p-3"
        >
          <Zap className="h-4 w-4 text-sos animate-pulse" />
          <div className="flex-1">
            <p className="text-xs font-bold text-sos">{highCount} High Priority Case{highCount > 1 ? "s" : ""}</p>
            <p className="text-[10px] text-sos/70">Require immediate attention — assault, threats, or emergencies</p>
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] text-sos" onClick={() => setFilter("high_priority")}>
            View Now
          </Button>
        </motion.div>
      )}

      {/* Suspicious alert */}
      {suspiciousCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3"
        >
          <ShieldX className="h-4 w-4 text-warning" />
          <div className="flex-1">
            <p className="text-xs font-bold text-warning">{suspiciousCount} Suspicious Report{suspiciousCount > 1 ? "s" : ""}</p>
            <p className="text-[10px] text-warning/70">AI flagged potential fake complaints</p>
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] text-warning" onClick={() => setFilter("suspicious")}>
            Review
          </Button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "all", label: `All (${incidents.length})` },
          { id: "high_priority", label: `🔴 High (${highCount})` },
          { id: "medium_priority", label: `🟡 Medium (${mediumCount})` },
          { id: "low_priority", label: `🟢 Low (${lowCount})` },
          { id: "suspicious", label: `⚠️ Suspicious (${suspiciousCount})` },
          { id: "anonymous", label: `Anonymous (${incidents.filter(i => i.is_anonymous).length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Complaint Cards */}
      {filtered.map((incident, i) => (
        <ComplaintCard
          key={incident.id}
          incident={incident}
          index={i}
          summary={summaries[incident.id]}
          verification={verifications[incident.id]}
          summarizing={summarizing === incident.id}
          verifying={verifying === incident.id}
          onSummarize={() => callAI(incident, "summarize")}
          onVerify={() => callAI(incident, "verify")}
        />
      ))}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border/30 bg-card p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No complaints found</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityComplaints;
