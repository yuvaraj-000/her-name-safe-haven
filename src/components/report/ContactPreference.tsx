import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

interface Props {
  contactPreference: string;
  contactPhone: string;
  contactEmail: string;
  onChange: (field: string, value: string) => void;
}

const METHODS = [
  { value: "phone", label: "Phone", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "in_app", label: "In-App Chat", icon: MessageSquare },
];

const ContactPreference = ({ contactPreference, contactPhone, contactEmail, onChange }: Props) => {
  const [allowContact, setAllowContact] = useState(!!contactPreference);

  const handleToggle = (checked: boolean) => {
    setAllowContact(checked);
    if (!checked) {
      onChange("contactPreference", "");
      onChange("contactPhone", "");
      onChange("contactEmail", "");
    }
  };

  return (
    <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-card-foreground">Allow police to contact me</p>
          <p className="text-xs text-muted-foreground">Optional — even in anonymous mode</p>
        </div>
        <Switch checked={allowContact} onCheckedChange={handleToggle} />
      </div>

      {allowContact && (
        <div className="space-y-3 border-t border-border/30 pt-3">
          <div className="flex gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onChange("contactPreference", m.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                    contactPreference === m.value
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-border/30 text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {contactPreference === "phone" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Temporary Phone Number</Label>
              <Input
                placeholder="Your contact number"
                value={contactPhone}
                onChange={(e) => onChange("contactPhone", e.target.value)}
                type="tel"
                maxLength={20}
              />
            </div>
          )}
          {contactPreference === "email" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input
                placeholder="Your email address"
                value={contactEmail}
                onChange={(e) => onChange("contactEmail", e.target.value)}
                type="email"
                maxLength={255}
              />
            </div>
          )}
          {contactPreference === "in_app" && (
            <p className="text-[10px] text-muted-foreground">
              Police will contact you through the Case Chat after your report is reviewed.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactPreference;
