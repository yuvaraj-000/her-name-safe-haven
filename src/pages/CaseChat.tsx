import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AnonymousChat from "@/components/chat/AnonymousChat";
import IdentityRevealDialog from "@/components/chat/IdentityRevealDialog";
import BottomNav from "@/components/BottomNav";

const CaseChat = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Case not found</p>
        <Button onClick={() => navigate("/cases")}>Go to Cases</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground truncate">{incident.case_id}</h1>
              {incident.is_anonymous ? (
                <Badge variant="outline" className="text-[9px] border-safe/30 text-safe gap-1">
                  <EyeOff className="h-2.5 w-2.5" /> Anonymous
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary gap-1">
                  <Eye className="h-2.5 w-2.5" /> Identified
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{incident.title}</p>
          </div>
          {incident.is_anonymous && (
            <IdentityRevealDialog
              incidentId={incident.id}
              caseId={incident.case_id || ""}
              alreadyRevealed={incident.identity_revealed}
            />
          )}
        </div>
      </div>

      {/* Counsellor Support Banner */}
      <div className="mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-primary">Support Available</p>
          <p className="text-[10px] text-muted-foreground">
            Need help? Connect with a women protection officer, legal advisor, or counsellor through the{" "}
            <button onClick={() => navigate("/helplines")} className="text-primary underline">
              Helplines
            </button>{" "}
            page.
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 mx-4 mt-3 rounded-xl border border-border/30 bg-card overflow-hidden">
        <AnonymousChat incidentId={incident.id} caseId={incident.case_id || ""} />
      </div>

      <BottomNav />
    </div>
  );
};

export default CaseChat;
