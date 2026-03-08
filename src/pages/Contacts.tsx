import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Phone, Shield } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relationship: "" });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user!.id,
        name: form.name,
        phone: form.phone,
        relationship: form.relationship || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ name: "", phone: "", relationship: "" });
      setShowForm(false);
      toast({ title: "Contact Added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contact Removed" });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    addMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Trusted Contacts</h1>
          <p className="text-sm text-muted-foreground">Your safety network</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAdd} className="mb-6 space-y-3 overflow-hidden rounded-xl bg-card p-4 shadow-card">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="Phone number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input placeholder="e.g. Sister, Friend" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving..." : "Save Contact"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : contacts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 pt-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No trusted contacts yet.<br />Add someone you trust to your safety network.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.relationship || "Contact"} · {c.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:${c.phone}`} className="rounded-lg bg-safe/10 p-2 text-safe hover:bg-safe/20 transition-colors">
                  <Phone className="h-4 w-4" />
                </a>
                <button onClick={() => deleteMutation.mutate(c.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Contacts;
