import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface AnonymousChatProps {
  incidentId: string;
  caseId: string;
  isAuthority?: boolean;
}

interface ChatMessage {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

const AnonymousChat = ({ incidentId, caseId, isAuthority = false }: AnonymousChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("case_messages")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) || []);
      setLoading(false);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`case-${incidentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "case_messages",
        filter: `incident_id=eq.${incidentId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [incidentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    try {
      if (isAuthority) {
        // Authority sends via edge function (service role)
        await supabase.functions.invoke("authority-update", {
          body: {
            action: "send_message",
            id: incidentId,
            data: { message: newMessage.trim(), sender_type: "authority" },
          },
        });
      } else {
        // Victim sends directly
        await supabase.from("case_messages").insert({
          incident_id: incidentId,
          sender_type: "victim" as const,
          sender_id: user?.id,
          message: newMessage.trim(),
        });
      }
      setNewMessage("");
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30">
        <Shield className="h-4 w-4 text-safe" />
        <div>
          <p className="text-xs font-semibold text-foreground">Anonymous Secure Chat</p>
          <p className="text-[10px] text-muted-foreground">Case {caseId} • Identity Protected</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No messages yet</p>
            <p className="text-[10px] text-muted-foreground/60">
              {isAuthority
                ? "Send a message to communicate with the victim anonymously"
                : "You can communicate with police without revealing your identity"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isOwn = isAuthority
                ? msg.sender_type === "authority"
                : msg.sender_type === "victim";
              const isSystem = msg.sender_type === "system";

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isSystem ? "justify-center" : isOwn ? "justify-end" : "justify-start"}`}
                >
                  {isSystem ? (
                    <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5">
                      <p className="text-[10px] text-warning font-medium">{msg.message}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}>
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                        {msg.sender_type === "authority" ? "👮 Police" : "🛡️ Anonymous Victim"}
                      </p>
                      <p className="text-xs leading-relaxed">{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                        {format(new Date(msg.created_at), "HH:mm")}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2">
          <Textarea
            placeholder={isAuthority ? "Message victim anonymously..." : "Reply anonymously..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[40px] max-h-[80px] text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="shrink-0 h-10 w-10"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1 flex items-center gap-1">
          <Shield className="h-2.5 w-2.5" /> End-to-end encrypted • Identity hidden
        </p>
      </div>
    </div>
  );
};

export default AnonymousChat;
