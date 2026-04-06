import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { color: string; label: string }> = {
  harassment: { color: "bg-sos/10 text-sos", label: "Harassment" },
  unsafe_area: { color: "bg-warning/10 text-warning", label: "Unsafe Area" },
  stalking: { color: "bg-primary/10 text-primary", label: "Stalking" },
  theft: { color: "bg-accent/10 text-accent", label: "Theft" },
  other: { color: "bg-muted text-muted-foreground", label: "Other" },
};

interface Report {
  id: string;
  report_type: string;
  description: string | null;
  upvotes: number;
  created_at: string;
  expires_at: string;
}

interface Props {
  report: Report;
  hasUpvoted: boolean;
  onUpvoted: () => void;
}

const DangerZoneCard = ({ report, hasUpvoted, onUpvoted }: Props) => {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const cfg = typeConfig[report.report_type] || typeConfig.other;

  const handleUpvote = async () => {
    if (!user || voting) return;
    setVoting(true);

    if (hasUpvoted) {
      // Remove upvote
      await supabase
        .from("safety_report_upvotes")
        .delete()
        .eq("report_id", report.id)
        .eq("user_id", user.id);
      await supabase
        .from("safety_reports")
        .update({ upvotes: Math.max(0, report.upvotes - 1) })
        .eq("id", report.id);
    } else {
      // Add upvote + reset expiry
      const { error } = await supabase
        .from("safety_report_upvotes")
        .insert({ report_id: report.id, user_id: user.id });
      if (!error) {
        const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("safety_reports")
          .update({ upvotes: report.upvotes + 1, expires_at: newExpiry })
          .eq("id", report.id);
        toast.success("Marked as still unsafe — expiry extended 24h");
      }
    }

    setVoting(false);
    onUpvoted();
  };

  const timeLeft = formatDistanceToNow(new Date(report.expires_at), { addSuffix: false });

  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" /> {timeLeft} left
        </span>
      </div>
      {report.description && (
        <p className="mt-2 text-sm text-card-foreground/80">{report.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
        </span>
        <Button
          variant={hasUpvoted ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleUpvote}
          disabled={voting}
        >
          <ThumbsUp className="h-3 w-3" />
          Still Unsafe ({report.upvotes})
        </Button>
      </div>
    </div>
  );
};

export default DangerZoneCard;
