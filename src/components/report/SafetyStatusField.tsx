import { Label } from "@/components/ui/label";
import { ShieldX, ShieldCheck, AlertTriangle } from "lucide-react";

const SAFETY_OPTIONS = [
  { value: "safe", label: "Yes, I'm Safe", icon: ShieldCheck, color: "border-safe/30 text-safe bg-safe/10" },
  { value: "unsafe", label: "No", icon: ShieldX, color: "border-sos/30 text-sos bg-sos/10" },
  { value: "need_help", label: "Need Help Now", icon: AlertTriangle, color: "border-warning/30 text-warning bg-warning/10" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SafetyStatusField = ({ value, onChange }: Props) => (
  <div className="space-y-2">
    <Label>Are you safe right now?</Label>
    <div className="grid grid-cols-3 gap-2">
      {SAFETY_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
              value === opt.value ? opt.color : "border-border/30 text-muted-foreground hover:bg-secondary/30"
            }`}
          >
            <Icon className="h-5 w-5" />
            {opt.label}
          </button>
        );
      })}
    </div>
    {value === "need_help" && (
      <p className="text-[10px] text-warning font-medium animate-pulse">
        ⚠ Your report will be flagged as urgent priority
      </p>
    )}
  </div>
);

export default SafetyStatusField;
