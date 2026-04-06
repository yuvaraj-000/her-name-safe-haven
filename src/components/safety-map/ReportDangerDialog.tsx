import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "harassment", label: "Harassment", emoji: "🔴" },
  { value: "unsafe_area", label: "Unsafe Area", emoji: "🟡" },
  { value: "stalking", label: "Stalking", emoji: "🟣" },
  { value: "theft", label: "Theft", emoji: "🟠" },
  { value: "other", label: "Other", emoji: "⚪" },
];

interface Props {
  onReported: () => void;
}

const ReportDangerDialog = ({ onReported }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        toast.error("Could not get your location. Please enable GPS.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !gps) captureGPS();
  };

  const handleSubmit = async () => {
    if (!type || !gps || !user) {
      toast.error("Please select a type and ensure GPS is captured.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("safety_reports").insert({
      user_id: user.id,
      report_type: type,
      description: description.trim() || null,
      latitude: gps.lat,
      longitude: gps.lng,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit report");
      return;
    }
    toast.success("Danger zone reported! It will be visible for 24 hours.");
    setType("");
    setDescription("");
    setGps(null);
    setOpen(false);
    onReported();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          Report Unsafe Area
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-sos" />
            Report Danger Zone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* GPS */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <MapPin className={`h-4 w-4 ${gps ? "text-safe" : "text-muted-foreground"}`} />
            <span className="text-xs font-mono text-muted-foreground">
              {gpsLoading ? "Acquiring GPS..." : gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "No location"}
            </span>
            {!gps && !gpsLoading && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs" onClick={captureGPS}>
                Retry
              </Button>
            )}
          </div>

          {/* Type */}
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Select incident type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Description */}
          <Textarea
            placeholder="What happened? (optional but helpful)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />

          <Button onClick={handleSubmit} disabled={submitting || !type || !gps} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDangerDialog;
