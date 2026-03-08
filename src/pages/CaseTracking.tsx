import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, Search, AlertCircle, Shield, MessageCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  submitted: { icon: FileText, color: "text-primary bg-primary/10", label: "Submitted" },
  under_review: { icon: Search, color: "text-warning bg-warning/10", label: "Under Review" },
  investigating: { icon: AlertCircle, color: "text-accent bg-accent/10", label: "Investigating" },
  resolved: { icon: CheckCircle2, color: "text-safe bg-safe/10", label: "Resolved" },
  closed: { icon: Shield, color: "text-muted-foreground bg-muted", label: "Closed" },
};

const statusOrder = ["submitted", "under_review", "investigating", "resolved"];

const CaseTracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Case Tracking</h1>
      <p className="text-sm text-muted-foreground mb-6">Monitor your report progress & chat with police</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No cases yet.<br />Reports you submit will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c, i) => {
            const currentIdx = statusOrder.indexOf(c.status);
            const config = statusConfig[c.status] || statusConfig.submitted;
            const Icon = config.icon;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {/* Case ID badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary font-mono">
                        {c.case_id || "Generating..."}
                      </span>
                      {c.is_anonymous ? (
                        <Badge variant="outline" className="text-[9px] border-safe/30 text-safe gap-0.5">
                          <EyeOff className="h-2.5 w-2.5" /> Anonymous
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary gap-0.5">
                          <Eye className="h-2.5 w-2.5" /> Identified
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-card-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(c.created_at).toLocaleDateString()} · {c.location || "No location"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-1 mt-4">
                  {statusOrder.map((status, idx) => {
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const sc = statusConfig[status];
                    return (
                      <div key={status} className="flex items-center flex-1">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isCompleted
                            ? isCurrent ? sc.color + " ring-2 ring-offset-1 ring-current" : "bg-safe/20 text-safe"
                            : "bg-muted text-muted-foreground/40"
                        }`}>
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        {idx < statusOrder.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 rounded ${isCompleted && idx < currentIdx ? "bg-safe/40" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 px-1">
                  {statusOrder.map(s => (
                    <span key={s} className="text-[9px] text-muted-foreground text-center flex-1">{statusConfig[s].label}</span>
                  ))}
                </div>

                {/* Chat Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => navigate(`/cases/${c.id}/chat`)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat with Police (Anonymous)
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default CaseTracking;
