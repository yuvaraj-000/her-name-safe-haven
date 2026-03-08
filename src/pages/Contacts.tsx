import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Trash2, Phone, Shield, Star, Bell, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const RELATIONSHIPS = [
  { value: "parent", label: "👨‍👩‍👧 Parent" },
  { value: "sibling", label: "👫 Sibling" },
  { value: "friend", label: "🤝 Friend" },
  { value: "guardian", label: "🛡️ Guardian" },
  { value: "partner", label: "💕 Partner" },
  { value: "relative", label: "👪 Relative" },
  { value: "neighbor", label: "🏠 Neighbor" },
  { value: "other", label: "📋 Other" },
];

const getRelationshipLabel = (value: string | null) => {
  if (!value) return "Contact";
  const found = RELATIONSHIPS.find((r) => r.value === value);
  return found ? found.label : value;
};

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relationship: "", isPrimary: false });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false })
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
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship || null,
        is_primary: form.isPrimary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ name: "", phone: "", relationship: "", isPrimary: false });
      setShowForm(false);
      toast({ title: "✅ Contact Added", description: "They will be notified during SOS emergencies." });
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

  const togglePrimary = useMutation({
    mutationFn: async ({ id, isPrimary }: { id: string; isPrimary: boolean }) => {
      const { error } = await supabase
        .from("emergency_contacts")
        .update({ is_primary: isPrimary })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    addMutation.mutate();
  };

  const primaryContacts = contacts.filter((c) => c.is_primary);
  const otherContacts = contacts.filter((c) => !c.is_primary);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Trusted Contacts</h1>
          <p className="text-sm text-muted-foreground">Your emergency safety network</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </div>

      {/* SOS Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-3"
      >
        <div className="flex items-start gap-2">
          <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">When SOS is activated, all contacts receive:</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1">🚨 Emergency alert notification</li>
              <li className="flex items-center gap-1">📍 Live location tracking link</li>
              <li className="flex items-center gap-1">📊 Real-time status updates</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Add Contact Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="mb-6 space-y-3 overflow-hidden rounded-xl bg-card p-4 shadow-card"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Contact name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select
                value={form.relationship}
                onValueChange={(val) => setForm({ ...form, relationship: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Primary Contact</p>
                  <p className="text-[10px] text-muted-foreground">Notified first during emergencies</p>
                </div>
              </div>
              <Switch
                checked={form.isPrimary}
                onCheckedChange={(checked) => setForm({ ...form, isPrimary: checked })}
              />
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
          <p className="text-muted-foreground text-sm">
            No trusted contacts yet.
            <br />
            Add parents, friends, or guardians to your safety network.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Primary Contacts */}
          {primaryContacts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warning mb-2 flex items-center gap-1">
                <Star className="h-3 w-3" /> Primary Contacts
              </p>
              <div className="space-y-2">
                {primaryContacts.map((c, i) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    index={i}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onTogglePrimary={(id, val) => togglePrimary.mutate({ id, isPrimary: val })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Contacts */}
          {otherContacts.length > 0 && (
            <div>
              {primaryContacts.length > 0 && (
                <p className="text-xs font-semibold text-muted-foreground mb-2">Other Contacts</p>
              )}
              <div className="space-y-2">
                {otherContacts.map((c, i) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    index={i}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onTogglePrimary={(id, val) => togglePrimary.mutate({ id, isPrimary: val })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} will be notified during SOS
              {primaryContacts.length > 0 && ` · ${primaryContacts.length} primary`}
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

interface ContactCardProps {
  contact: any;
  index: number;
  onDelete: (id: string) => void;
  onTogglePrimary: (id: string, isPrimary: boolean) => void;
}

const ContactCard = ({ contact: c, index, onDelete, onTogglePrimary }: ContactCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={`flex items-center justify-between rounded-xl bg-card p-4 shadow-card ${
      c.is_primary ? "ring-1 ring-warning/30" : ""
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full font-display font-bold text-sm ${
          c.is_primary ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
        }`}
      >
        {c.is_primary ? <Star className="h-4 w-4" /> : c.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-card-foreground">{c.name}</p>
        <p className="text-xs text-muted-foreground">
          {getRelationshipLabel(c.relationship)} · {c.phone}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onTogglePrimary(c.id, !c.is_primary)}
        className={`rounded-lg p-2 transition-colors ${
          c.is_primary ? "bg-warning/10 text-warning hover:bg-warning/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
        title={c.is_primary ? "Remove primary" : "Set as primary"}
      >
        <Star className="h-4 w-4" />
      </button>
      <a
        href={`tel:${c.phone}`}
        className="rounded-lg bg-safe/10 p-2 text-safe hover:bg-safe/20 transition-colors"
      >
        <Phone className="h-4 w-4" />
      </a>
      <button
        onClick={() => onDelete(c.id)}
        className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </motion.div>
);

export default Contacts;
