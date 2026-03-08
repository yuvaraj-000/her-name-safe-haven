import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, ChevronRight, Shield, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";

interface CaseWithLastMessage {
  id: string;
  case_id: string | null;
  title: string;
  status: string;
  is_anonymous: boolean | null;
  priority_level: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: boolean;
}

const UserChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCases = async () => {
      // Get all incidents for this user
      const { data: incidents } = await supabase
        .from("incidents")
        .select("id, case_id, title, status, is_anonymous, priority_level")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!incidents || incidents.length === 0) {
        setCases([]);
        setLoading(false);
        return;
      }

      // Get last message for each incident
      const casesWithMessages: CaseWithLastMessage[] = await Promise.all(
        incidents.map(async (inc) => {
          const { data: msgs } = await supabase
            .from("case_messages")
            .select("message, created_at, sender_type")
            .eq("incident_id", inc.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = msgs?.[0];
          return {
            ...inc,
            last_message: lastMsg?.message || null,
            last_message_at: lastMsg?.created_at || null,
            unread: lastMsg?.sender_type === "authority",
          };
        })
      );

      setCases(casesWithMessages);
      setLoading(false);
    };

    fetchCases();

    // Listen for new messages across all cases
    const channel = supabase
      .channel("user-chat-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "case_messages",
      }, () => {
        fetchCases();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const priorityColor = (p: string | null) => {
    if (p === "HIGH") return "text-primary border-primary/30";
    if (p === "MEDIUM") return "text-warning border-warning/30";
    return "text-muted-foreground border-border";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
            <MessageCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground neon-text">Messages</h1>
            <p className="text-[10px] text-muted-foreground">Secure anonymous conversations</p>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="px-4 pt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card border border-border mx-auto mb-4 neon-border-subtle">
              <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">File a report to start communicating with authorities</p>
          </div>
        ) : (
          cases.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/cases/${c.id}/chat`)}
              className={`w-full flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/30 active:scale-[0.98] ${
                c.unread ? "neon-border border-primary/30" : "neon-border-subtle border-border"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                c.unread ? "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : "bg-secondary"
              }`}>
                <Shield className={`h-4 w-4 ${c.unread ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{c.case_id || "Pending"}</span>
                  {c.priority_level && (
                    <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 ${priorityColor(c.priority_level)}`}>
                      {c.priority_level}
                    </Badge>
                  )}
                  {c.unread && (
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.title}</p>
                {c.last_message && (
                  <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{c.last_message}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {c.last_message_at && (
                  <span className="text-[9px] text-muted-foreground">{format(new Date(c.last_message_at), "HH:mm")}</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>
            </motion.button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default UserChat;
