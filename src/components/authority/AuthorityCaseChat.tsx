import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Eye, EyeOff, Shield, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AnonymousChat from "@/components/chat/AnonymousChat";
import { format } from "date-fns";

const AuthorityCaseChat = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

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
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (selectedCase) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{selectedCase.case_id}</h3>
            <p className="text-[10px] text-muted-foreground">{selectedCase.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCase.identity_revealed ? (
              <Badge variant="outline" className="text-[9px] border-safe/30 text-safe gap-1">
                <Eye className="h-2.5 w-2.5" /> Identity Revealed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] border-warning/30 text-warning gap-1">
                <EyeOff className="h-2.5 w-2.5" /> Anonymous
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSelectedCase(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedCase.identity_revealed && (
          <div className="rounded-xl border border-safe/30 bg-safe/5 p-3">
            <p className="text-[10px] font-semibold text-safe mb-1">Victim Identity (Revealed)</p>
            <p className="text-xs text-foreground">
              Contact police records for full details — User ID: {selectedCase.user_id.slice(0, 8)}...
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border/30 overflow-hidden" style={{ background: "hsl(220 25% 12%)" }}>
          <AnonymousChat
            incidentId={selectedCase.id}
            caseId={selectedCase.case_id || ""}
            isAuthority
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        Anonymous Case Chat
      </h2>

      <p className="text-xs text-muted-foreground">
        Communicate with victims securely without exposing their identity. 
        Victims control when to reveal who they are.
      </p>

      {cases.map((c, i) => (
        <motion.button
          key={c.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => setSelectedCase(c)}
          className="w-full rounded-xl border border-border/30 p-4 text-left transition-colors hover:border-primary/30"
          style={{ background: "hsl(220 25% 12%)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary font-mono">{c.case_id || "—"}</span>
                {c.is_anonymous ? (
                  <Badge variant="outline" className="text-[9px] border-warning/30 text-warning gap-1">
                    <EyeOff className="h-2.5 w-2.5" /> Anonymous
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] border-safe/30 text-safe gap-1">
                    <Eye className="h-2.5 w-2.5" /> Identified
                  </Badge>
                )}
                {c.identity_revealed && (
                  <Badge variant="outline" className="text-[9px] border-safe/30 text-safe">
                    Revealed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground truncate">{c.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {c.location || "No location"} • {format(new Date(c.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </motion.button>
      ))}

      {cases.length === 0 && (
        <div className="rounded-xl border border-border/30 p-8 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No cases to chat about</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityCaseChat;
