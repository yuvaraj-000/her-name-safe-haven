import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, MapPin, Clock, User, UserX, Sparkles, AlertTriangle,
  CheckCircle, ShieldCheck, ShieldX, ShieldAlert, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AuthorityComplaints = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "anonymous" | "high" | "verified" | "suspicious">("all");
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
        // Auto-update verification status based on AI result
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
    if (filter === "anonymous") return i.is_anonymous;
    if (filter === "high") return i.threat_level === "high";
    if (filter === "verified") return i.verification_status === "verified";
    if (filter === "suspicious") return i.verification_status === "suspicious";
    return true;
  });

  const threatColor = (level: string) => {
    switch (level) {
      case "high": return "text-sos bg-sos/10";
      case "medium": return "text-warning bg-warning/10";
      default: return "text-safe bg-safe/10";
    }
  };

  const verificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="outline" className="text-[10px] border-safe/30 text-safe gap-1">
            <CheckCircle className="h-3 w-3" /> Verified
          </Badge>
        );
      case "suspicious":
        return (
          <Badge variant="outline" className="text-[10px] border-sos/30 text-sos gap-1 animate-pulse">
            <ShieldX className="h-3 w-3" /> Suspicious
          </Badge>
        );
      case "needs_review":
        return (
          <Badge variant="outline" className="text-[10px] border-warning/30 text-warning gap-1">
            <ShieldAlert className="h-3 w-3" /> Needs Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle className="h-3 w-3 text-safe" />;
      case "investigating": return <Clock className="h-3 w-3 text-warning" />;
      default: return <AlertTriangle className="h-3 w-3 text-primary" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const suspiciousCount = incidents.filter(i => i.verification_status === "suspicious").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Complaint Management
      </h2>

      {/* Suspicious alert banner */}
      {suspiciousCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-sos/30 bg-sos/10 p-3"
        >
          <ShieldX className="h-4 w-4 text-sos" />
          <div className="flex-1">
            <p className="text-xs font-bold text-sos">{suspiciousCount} Suspicious Report{suspiciousCount > 1 ? "s" : ""} Flagged</p>
            <p className="text-[10px] text-sos/70">AI detected potential fake complaints requiring review</p>
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] text-sos" onClick={() => setFilter("suspicious")}>
            View
          </Button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "all" as const, label: `All (${incidents.length})` },
          { id: "verified" as const, label: `Verified (${incidents.filter(i => i.verification_status === "verified").length})` },
          { id: "suspicious" as const, label: `Suspicious (${suspiciousCount})` },
          { id: "anonymous" as const, label: `Anonymous (${incidents.filter(i => i.is_anonymous).length})` },
          { id: "high" as const, label: `High (${incidents.filter(i => i.threat_level === "high").length})` },
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

      {filtered.map((incident, i) => (
        <motion.div
          key={incident.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className={`rounded-xl border p-4 space-y-3 ${
            incident.verification_status === "suspicious"
              ? "border-sos/30 bg-sos/5"
              : "border-border/30"
          }`}
          style={incident.verification_status !== "suspicious" ? { background: "hsl(220 25% 12%)" } : undefined}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {statusIcon(incident.status)}
                <h3 className="text-sm font-semibold text-foreground truncate">{incident.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{incident.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={`text-[10px] ${threatColor(incident.threat_level || "medium")}`}>
                {(incident.threat_level || "medium").toUpperCase()}
              </Badge>
              {verificationBadge(incident.verification_status || "pending")}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(incident.created_at), "MMM d, HH:mm")}
            </span>
            {incident.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {incident.location}
              </span>
            )}
            {incident.latitude && (
              <span className="flex items-center gap-1 font-mono">
                📍 {incident.latitude.toFixed(4)}, {incident.longitude?.toFixed(4)}
              </span>
            )}
            <span className="flex items-center gap-1">
              {incident.is_anonymous ? <UserX className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {incident.is_anonymous ? "Anonymous" : incident.user_id.slice(0, 8) + "..."}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border/20 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">{incident.status}</Badge>
            <span className="text-[10px] text-muted-foreground">ID: {incident.id.slice(0, 8)}</span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[10px] text-primary hover:bg-primary/10"
              onClick={() => callAI(incident, "summarize")}
              disabled={summarizing === incident.id}
            >
              <Sparkles className="h-3 w-3" />
              {summarizing === incident.id ? "Analyzing..." : "AI Summarize"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[10px] text-warning hover:bg-warning/10"
              onClick={() => callAI(incident, "verify")}
              disabled={verifying === incident.id}
            >
              <ShieldCheck className="h-3 w-3" />
              {verifying === incident.id ? "Verifying..." : "AI Verify"}
            </Button>
          </div>

          {summaries[incident.id] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg border border-primary/20 bg-primary/5 p-3"
            >
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary">AI Summary</span>
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-line">{summaries[incident.id]}</p>
            </motion.div>
          )}

          {(verifications[incident.id] || incident.verification_result) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`rounded-lg border p-3 ${
                incident.verification_status === "suspicious"
                  ? "border-sos/20 bg-sos/5"
                  : incident.verification_status === "verified"
                  ? "border-safe/20 bg-safe/5"
                  : "border-warning/20 bg-warning/5"
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {incident.verification_status === "suspicious" ? (
                  <ShieldX className="h-3 w-3 text-sos" />
                ) : incident.verification_status === "verified" ? (
                  <CheckCircle className="h-3 w-3 text-safe" />
                ) : (
                  <ShieldCheck className="h-3 w-3 text-warning" />
                )}
                <span className={`text-[10px] font-semibold ${
                  incident.verification_status === "suspicious" ? "text-sos"
                  : incident.verification_status === "verified" ? "text-safe"
                  : "text-warning"
                }`}>
                  AI Verification — {(incident.verification_status || "pending").toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-line">
                {verifications[incident.id] || incident.verification_result}
              </p>
            </motion.div>
          )}
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border/30 p-8 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No complaints found</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityComplaints;
