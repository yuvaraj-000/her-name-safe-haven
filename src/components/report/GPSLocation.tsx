import { MapPin, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  gpsCoords: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  onRetry: () => void;
}

const GPSLocation = ({ gpsCoords, gpsLoading, onRetry }: Props) => (
  <div className="rounded-xl bg-card p-4 shadow-card">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <MapPin className={`h-5 w-5 ${gpsCoords ? "text-safe" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-semibold text-card-foreground">GPS Location</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {gpsLoading
              ? "Acquiring location..."
              : gpsCoords
              ? `${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}`
              : "Location unavailable"}
          </p>
        </div>
      </div>
      {gpsCoords ? (
        <Badge variant="outline" className="text-[10px] border-safe/30 text-safe">
          <CheckCircle className="h-3 w-3 mr-1" /> Captured
        </Badge>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  </div>
);

export default GPSLocation;
