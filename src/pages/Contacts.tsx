import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Phone, Shield } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const STORAGE_KEY = "hername-contacts";

const Contacts = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relationship: "" });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    const newContact: Contact = { id: Date.now().toString(), ...form };
    setContacts([...contacts, newContact]);
    setForm({ name: "", phone: "", relationship: "" });
    setShowForm(false);
    toast({ title: "Contact Added", description: `${form.name} added to your trusted contacts.` });
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
    toast({ title: "Contact Removed" });
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
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={addContact}
            className="mb-6 space-y-3 overflow-hidden rounded-xl bg-card p-4 shadow-card"
          >
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
            <Button type="submit" variant="hero" className="w-full">Save Contact</Button>
          </motion.form>
        )}
      </AnimatePresence>

      {contacts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 pt-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No trusted contacts yet.<br />Add someone you trust to your safety network.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card"
            >
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
                <button onClick={() => removeContact(c.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 transition-colors">
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
