import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface IdentityRevealDialogProps {
  incidentId: string;
  caseId: string;
  alreadyRevealed?: boolean;
}

const IdentityRevealDialog = ({ incidentId, caseId, alreadyRevealed }: IdentityRevealDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choice" | "reveal" | "done">("choice");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const handleReveal = async () => {
    if (!form.name || !form.phone) return;
    setLoading(true);

    try {
      // Update incident to mark identity revealed
      await supabase.from("incidents").update({
        identity_revealed: true,
        revealed_at: new Date().toISOString(),
        is_anonymous: false,
      }).eq("id", incidentId).eq("user_id", user!.id);

      // Update profile with provided info
      await supabase.from("profiles").update({
        full_name: form.name,
        phone: form.phone,
      }).eq("user_id", user!.id);

      // Send system message in chat
      await supabase.from("case_messages").insert({
        incident_id: incidentId,
        sender_type: "system" as const,
        sender_id: user!.id,
        message: `Victim has voluntarily revealed their identity for Case ${caseId}. Legal action can now proceed.`,
      });

      setStep("done");
      toast({
        title: "Identity Revealed",
        description: "Your identity has been shared with the authorities securely.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (alreadyRevealed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-safe/10 border border-safe/30 p-3">
        <Eye className="h-4 w-4 text-safe" />
        <div>
          <p className="text-xs font-semibold text-safe">Identity Revealed</p>
          <p className="text-[10px] text-muted-foreground">You've shared your identity for this case</p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep("choice"); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs border-warning/30 text-warning hover:bg-warning/10">
          <ShieldAlert className="h-3.5 w-3.5" />
          Reveal Identity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Identity Disclosure
              </DialogTitle>
              <DialogDescription>
                Would you like to reveal your identity so police can take legal action?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("reveal")}
                className="w-full rounded-xl border border-safe/30 bg-safe/5 p-4 text-left transition-colors hover:bg-safe/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-safe/20">
                    <Eye className="h-5 w-5 text-safe" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reveal My Identity</p>
                    <p className="text-xs text-muted-foreground">Share your details for legal action</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setOpen(false)}
                className="w-full rounded-xl border border-border/30 bg-secondary/20 p-4 text-left transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/40">
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Stay Anonymous</p>
                    <p className="text-xs text-muted-foreground">Continue chatting anonymously</p>
                  </div>
                </div>
              </motion.button>

              <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 p-3 mt-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  Revealing your identity is voluntary. Police can still investigate
                  and monitor suspects without it. Only reveal when you feel safe.
                </p>
              </div>
            </div>
          </>
        )}

        {step === "reveal" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Share Your Details</DialogTitle>
              <DialogDescription>
                This information will only be shared with assigned officers for Case {caseId}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reveal-name">Full Name</Label>
                <Input
                  id="reveal-name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reveal-phone">Phone Number</Label>
                <Input
                  id="reveal-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reveal-address">Address (Optional)</Label>
                <Input
                  id="reveal-address"
                  placeholder="Enter your address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choice")}>
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleReveal}
                  disabled={loading || !form.name || !form.phone}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Confirm Reveal
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-safe/20">
              <Shield className="h-8 w-8 text-safe" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Identity Shared</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Police can now proceed with legal action on your case.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IdentityRevealDialog;
