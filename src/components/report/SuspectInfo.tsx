import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserX, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const RELATIONSHIPS = [
  "Stranger", "Boyfriend", "Husband", "Ex-Partner", "Family Member",
  "Colleague", "Neighbour", "Online Contact", "Other",
];

interface Props {
  suspectName: string;
  suspectPhone: string;
  suspectRelationship: string;
  onChange: (field: string, value: string) => void;
}

const SuspectInfo = ({ suspectName, suspectPhone, suspectRelationship, onChange }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <UserX className="h-5 w-5 text-muted-foreground" />
          <div className="text-left">
            <p className="text-sm font-semibold text-card-foreground">Suspect Information</p>
            <p className="text-xs text-muted-foreground">Optional — helps police identify the accused</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="suspect-name" className="text-xs">Suspect Name</Label>
            <Input
              id="suspect-name"
              placeholder="Name of accused person"
              value={suspectName}
              onChange={(e) => onChange("suspectName", e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspect-phone" className="text-xs">Suspect Phone Number</Label>
            <Input
              id="suspect-phone"
              placeholder="Phone number (if known)"
              value={suspectPhone}
              onChange={(e) => onChange("suspectPhone", e.target.value)}
              maxLength={20}
              type="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Relationship with Victim</Label>
            <Select value={suspectRelationship} onValueChange={(v) => onChange("suspectRelationship", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r.toLowerCase().replace(/\s+/g, "_")}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuspectInfo;
