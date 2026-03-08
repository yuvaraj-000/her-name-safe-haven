import { motion } from "framer-motion";
import {
  MapPin, Clock, User, UserX, Sparkles, AlertTriangle,
  CheckCircle, ShieldCheck, ShieldX, ShieldAlert, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ComplaintCardProps {
  incident: any;
  index: number;
  summary?: string;
  verification?: string;
  summarizing: boolean;
  verifying: boolean;
  onSummarize: () => void;
  onVerify: () => void;
}

const priorityConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  high: { color: "text-sos bg-sos/10 border-sos/30", icon: <Zap className="h-3 w-3" />, label: "HIGH PRIORITY" },
  medium: { color: "text-warning bg-warning/10 border-warning/30", icon: <AlertTriangle className="h-3 w-3" />, label: "MEDIUM" },
  low: { color: "text-safe bg-safe/10 border-safe/30", icon: <CheckCircle className="h-3 w-3" />, label: "LOW" },
};

const ComplaintCard = ({ incident, index, summary, verification, summarizing, verifying, onSummarize, onVerify }: ComplaintCardProps) => {
  const priority = priorityConfig[incident.priority_level] || priorityConfig.medium;

  const verificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="outline" className="text-[10px] border-safe/30 text-safe gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
      case "suspicious":
        return <Badge variant="outline" className="text-[10px] border-sos/30 text-sos gap-1 animate-pulse"><ShieldX className="h-3 w-3" /> Suspicious</Badge>;
      case "needs_review":
        return <Badge variant="outline" className="text-[10px] border-warning/30 text-warning gap-1"><ShieldAlert className="h-3 w-3" /> Needs Review</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle className="h-3 w-3 text-safe" />;
      case "investigating": return <Clock className="h-3 w-3 text-warning" />;
      default: return <AlertTriangle className="h-3 w-3 text-primary" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl border p-4 space-y-3 ${
        incident.priority_level === "high"
          ? "border-sos/30 bg-sos/5"
          : incident.verification_status === "suspicious"
          ? "border-warning/30 bg-warning/5"
          : "border-border/30 bg-card"
      }`}
    >
      {/* Priority Banner for HIGH */}
      {incident.priority_level === "high" && (
        <div className="flex items-center gap-2 rounded-lg bg-sos/10 px-3 py-1.5 -mt-1">
          <Zap className="h-3.5 w-3.5 text-sos animate-pulse" />
          <span className="text-[10px] font-bold text-sos tracking-wide">IMMEDIATE ATTENTION REQUIRED</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {statusIcon(incident.status)}
            <h3 className="text-sm font-semibold text-foreground truncate">{incident.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{incident.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-[10px] gap-1 ${priority.color}`}>
            {priority.icon} {priority.label}
          </Badge>
          {verificationBadge(incident.verification_status || "pending")}
        </div>
      </div>

      {/* AI Summary snippet */}
      {incident.ai_summary && !summary && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
          <p className="text-[10px] font-semibold text-primary mb-0.5">AI Screening Result</p>
          <p className="text-xs text-foreground/70 line-clamp-3 whitespace-pre-line">{incident.ai_summary}</p>
        </div>
      )}

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
        <span className="text-[10px] text-primary font-mono font-bold">{incident.case_id || "ID: " + incident.id.slice(0, 8)}</span>
        <div className="flex-1" />
        <Button
          size="sm" variant="ghost"
          className="h-7 gap-1 text-[10px] text-primary hover:bg-primary/10"
          onClick={onSummarize}
          disabled={summarizing}
        >
          <Sparkles className="h-3 w-3" />
          {summarizing ? "Analyzing..." : "AI Summarize"}
        </Button>
        <Button
          size="sm" variant="ghost"
          className="h-7 gap-1 text-[10px] text-warning hover:bg-warning/10"
          onClick={onVerify}
          disabled={verifying}
        >
          <ShieldCheck className="h-3 w-3" />
          {verifying ? "Verifying..." : "AI Verify"}
        </Button>
      </div>

      {summary && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">AI Summary</span>
          </div>
          <p className="text-xs text-foreground/80 whitespace-pre-line">{summary}</p>
        </motion.div>
      )}

      {(verification || incident.verification_result) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className={`rounded-lg border p-3 ${
            incident.verification_status === "suspicious" ? "border-sos/20 bg-sos/5"
            : incident.verification_status === "verified" ? "border-safe/20 bg-safe/5"
            : "border-warning/20 bg-warning/5"
          }`}
        >
          <div className="flex items-center gap-1 mb-1">
            {incident.verification_status === "suspicious" ? <ShieldX className="h-3 w-3 text-sos" />
            : incident.verification_status === "verified" ? <CheckCircle className="h-3 w-3 text-safe" />
            : <ShieldCheck className="h-3 w-3 text-warning" />}
            <span className={`text-[10px] font-semibold ${
              incident.verification_status === "suspicious" ? "text-sos"
              : incident.verification_status === "verified" ? "text-safe"
              : "text-warning"
            }`}>
              AI Verification — {(incident.verification_status || "pending").toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-foreground/80 whitespace-pre-line">
            {verification || incident.verification_result}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ComplaintCard;
