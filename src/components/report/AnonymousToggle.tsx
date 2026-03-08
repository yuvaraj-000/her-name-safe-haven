import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  anonymous: boolean;
  setAnonymous: (v: boolean) => void;
}

const AnonymousToggle = ({ anonymous, setAnonymous }: Props) => (
  <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
    <div className="flex items-center gap-3">
      <ShieldCheck className="h-5 w-5 text-safe" />
      <div>
        <p className="text-sm font-semibold text-card-foreground">Anonymous Report</p>
        <p className="text-xs text-muted-foreground">Your identity will be hidden</p>
      </div>
    </div>
    <Switch checked={anonymous} onCheckedChange={setAnonymous} />
  </div>
);

export default AnonymousToggle;
