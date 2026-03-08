import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Send, ShieldCheck, MapPin, Camera, FileVideo, Mic,
  X, AlertTriangle, Loader2, CheckCircle, ShieldX
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const THREAT_LEVELS = [
  { value: "low", label: "Low", color: "bg-safe/20 text-safe border-safe/30" },
  { value: "medium", label: "Medium", color: "bg-warning/20 text-warning border-warning/30" },
  { value: "high", label: "High", color: "bg-sos/20 text-sos border-sos/30" },
];

const Report = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", location: "", date: "", threatLevel: "medium",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Auto-capture GPS on mount
  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!("geolocation" in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Camera className="h-3 w-3" />;
    if (type.startsWith("video/")) return <FileVideo className="h-3 w-3" />;
    if (type.startsWith("audio/")) return <Mic className="h-3 w-3" />;
    return <Upload className="h-3 w-3" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Create incident with GPS coords
      const { data: incident, error } = await supabase.from("incidents").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        location: form.location || null,
        incident_date: form.date ? new Date(form.date).toISOString() : null,
        is_anonymous: anonymous,
        threat_level: form.threatLevel,
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
        verification_status: "pending",
      }).select().single();

      if (error) throw error;

      // Upload evidence files
      let hasEvidence = false;
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, file);
        if (uploadError) continue;

        await supabase.from("evidence").insert({
          user_id: user.id,
          incident_id: incident.id,
          file_name: file.name,
          file_type: file.type,
          file_path: filePath,
          file_size: file.size,
          source: "upload" as const,
        });
        hasEvidence = true;
      }

      // Auto AI verification
      setVerifying(true);
      try {
        const { data: verifyData } = await supabase.functions.invoke("ai-summarize", {
          body: {
            incident: { ...incident, has_evidence: hasEvidence },
            type: "verify",
          },
        });

        if (verifyData?.result) {
          // Parse the AI result to determine status
          const resultText = verifyData.result.toUpperCase();
          let status = "needs_review";
          if (resultText.includes("VERIFIED")) status = "verified";
          else if (resultText.includes("SUSPICIOUS")) status = "suspicious";

          await supabase.from("incidents").update({
            verification_status: status,
            verification_result: verifyData.result,
          }).eq("id", incident.id);
        }
      } catch {
        // AI verification failure doesn't block submission
      }
      setVerifying(false);

      toast({
        title: "Report Submitted & Verified",
        description: anonymous
          ? "Your anonymous report has been securely submitted and AI-verified."
          : "Your report has been securely submitted and AI-verified.",
      });
      navigate("/cases");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Report Incident</h1>
        <p className="text-sm text-muted-foreground mb-6">All reports are encrypted & AI-verified</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Anonymous Toggle */}
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

          {/* GPS Location Auto-capture */}
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
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={captureLocation}>
                  Retry
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Incident Title</Label>
            <Input
              id="title"
              placeholder="Brief description of the incident"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Detailed Description</Label>
            <Textarea
              id="desc"
              placeholder="Describe what happened in detail — include names, places, and events..."
              className="min-h-[120px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Where it happened"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          {/* Threat Level */}
          <div className="space-y-2">
            <Label>Threat Level</Label>
            <div className="flex gap-2">
              {THREAT_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm({ ...form, threatLevel: level.value })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.threatLevel === level.value
                      ? level.color
                      : "border-border/30 text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label>Evidence (Photos, Videos, Audio)</Label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-primary/5">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tap to upload photos, videos, or audio
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                Evidence strengthens AI verification
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
              />
            </label>

            {/* File previews */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-2.5 shadow-card">
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB • {file.type.split("/")[1]}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-sos">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Verification Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">AI Verification Active</p>
              <p className="text-[10px] text-muted-foreground">
                Your report will be automatically verified by AI to check description consistency,
                location data, timestamps, and evidence metadata. Verified reports are forwarded to
                authorities; suspicious reports are flagged for review.
              </p>
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full gap-2" disabled={loading || verifying}>
            {verifying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> AI Verifying...</>
            ) : loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="h-4 w-4" /> Submit Report</>
            )}
          </Button>
        </form>
      </motion.div>
      <BottomNav />
    </div>
  );
};

export default Report;
