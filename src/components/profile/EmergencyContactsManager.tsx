import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Phone, Shield, Star, Trash2, UserPlus } from "lucide-react";
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
import {
  RELATIONSHIPS,
  getRelationshipLabel,
  useEmergencyContacts,
  type EmergencyContact,
} from "@/hooks/useEmergencyContacts";

interface EmergencyContactsManagerProps {
  compact?: boolean;
}

const emptyForm = {
  name: "",
  phone: "",
  relationship: "",
  isPrimary: false,
};

const EmergencyContactsManager = ({ compact = false }: EmergencyContactsManagerProps) => {
  const { contacts, isLoading, addContact, deleteContact, togglePrimaryContact } =
    useEmergencyContacts();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    addContact.mutate(form, {
      onSuccess: () => {
        setForm(emptyForm);
        setShowForm(false);
      },
    });
  };

  const primaryContacts = contacts.filter((contact) => contact.is_primary);
  const otherContacts = contacts.filter((contact) => !contact.is_primary);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Emergency Contacts</h2>
          <p className="text-xs text-muted-foreground">
            Manage the numbers that receive your SOS location link instantly.
          </p>
        </div>
        <Button
          variant="hero"
          size="sm"
          onClick={() => setShowForm((current) => !current)}
          className="gap-1"
        >
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-3"
      >
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">SOS sends these to saved contacts:</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              <li>🚨 Instant emergency message</li>
              <li>📍 Live Google Maps location link</li>
              <li>📱 WhatsApp delivery to joined/verified numbers</li>
            </ul>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="space-y-3 overflow-hidden rounded-xl bg-card p-4 shadow-card"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Contact name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+91 9443875763"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select
                value={form.relationship}
                onValueChange={(value) => setForm({ ...form, relationship: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((relationship) => (
                    <SelectItem key={relationship.value} value={relationship.value}>
                      {relationship.label}
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
                  <p className="text-[10px] text-muted-foreground">Mark an important contact first</p>
                </div>
              </div>
              <Switch
                checked={form.isPrimary}
                onCheckedChange={(checked) => setForm({ ...form, isPrimary: checked })}
              />
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={addContact.isPending}>
              {addContact.isPending ? "Saving..." : "Save Contact"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : contacts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-card"
        >
          <Shield className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No emergency contacts saved yet.
            <br />
            Add the verified number that should receive SOS alerts.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {primaryContacts.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-warning">
                <Star className="h-3 w-3" /> Primary Contacts
              </p>
              <div className="space-y-2">
                {primaryContacts.map((contact, index) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    index={index}
                    onDelete={(id) => deleteContact.mutate(id)}
                    onTogglePrimary={(id, isPrimary) =>
                      togglePrimaryContact.mutate({ id, isPrimary })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {otherContacts.length > 0 && (
            <div>
              {primaryContacts.length > 0 && (
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Other Contacts</p>
              )}
              <div className="space-y-2">
                {otherContacts.map((contact, index) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    index={index}
                    onDelete={(id) => deleteContact.mutate(id)}
                    onTogglePrimary={(id, isPrimary) =>
                      togglePrimaryContact.mutate({ id, isPrimary })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {!compact && (
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""} will be notified during SOS
                {primaryContacts.length > 0 && ` · ${primaryContacts.length} primary`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ContactCardProps {
  contact: EmergencyContact;
  index: number;
  onDelete: (id: string) => void;
  onTogglePrimary: (id: string, isPrimary: boolean) => void;
}

const ContactCard = ({ contact, index, onDelete, onTogglePrimary }: ContactCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={`flex items-center justify-between rounded-xl bg-card p-4 shadow-card ${
      contact.is_primary ? "ring-1 ring-warning/30" : ""
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold ${
          contact.is_primary ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
        }`}
      >
        {contact.is_primary ? (
          <Star className="h-4 w-4" />
        ) : (
          contact.name.charAt(0).toUpperCase()
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-card-foreground">{contact.name}</p>
        <p className="text-xs text-muted-foreground">
          {getRelationshipLabel(contact.relationship)} · {contact.phone}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onTogglePrimary(contact.id, !contact.is_primary)}
        className={`rounded-lg p-2 transition-colors ${
          contact.is_primary
            ? "bg-warning/10 text-warning hover:bg-warning/20"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
        title={contact.is_primary ? "Remove primary" : "Set as primary"}
      >
        <Star className="h-4 w-4" />
      </button>
      <a
        href={`tel:${contact.phone}`}
        className="rounded-lg bg-safe/10 p-2 text-safe transition-colors hover:bg-safe/20"
      >
        <Phone className="h-4 w-4" />
      </a>
      <button
        onClick={() => onDelete(contact.id)}
        className="rounded-lg bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </motion.div>
);

export default EmergencyContactsManager;