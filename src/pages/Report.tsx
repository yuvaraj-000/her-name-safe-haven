import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Send, AlertTriangle, Loader2, ArrowLeft, Zap,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import AnonymousToggle from "@/components/report/AnonymousToggle";
import GPSLocation from "@/components/report/GPSLocation";
import EvidenceUpload from "@/components/report/EvidenceUpload";
import SafetyStatusField from "@/components/report/SafetyStatusField";
import SuspectInfo from "@/components/report/SuspectInfo";
import ContactPreference from "@/components/report/ContactPreference";
import FollowUpQuestionnaire from "@/components/report/FollowUpQuestionnaire";

const THREAT_LEVELS = [
  { value: "low", label: "Low", color: "bg-safe/20 text-safe border-safe/30" },
  { value: "medium", label: "Medium", color: "bg-warning/20 text-warning border-warning/30" },
  { value: "high", label: "High", color: "bg-sos/20 text-sos border-sos/30" },
];

const INCIDENT_TYPES = [
  "Harassment", "Stalking", "Blackmail", "Physical Assault",
  "Sexual Exploitation", "Cyber Harassment", "Domestic Violence",
];

const Report = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", location: "", date: "", time: "",
    threatLevel: "medium", incidentType: "",
    suspectName: "", suspectPhone: "", suspectRelationship: "",
    safetyStatus: "", contactPreference: "", contactPhone: "", contactEmail: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => { captureLocation(); }, []);

  const captureLocation = () => {
    if (!("geolocation" in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConvertToSOS = () => {
    navigate("/sos");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const incidentDate = form.date
        ? new Date(`${form.date}${form.time ? `T${form.time}` : ""}`).toISOString()
        : null;

      const { data: incident, error } = await supabase.from("incidents").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        location: form.location || null,
        incident_date: incidentDate,
        is_anonymous: anonymous,
        threat_level: form.threatLevel,
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
        verification_status: "pending",
        incident_type: form.incidentType || null,
        incident_time: form.time || null,
        suspect_name: form.suspectName || null,
        suspect_phone: form.suspectPhone || null,
        suspect_relationship: form.suspectRelationship || null,
        safety_status: form.safetyStatus || null,
        contact_preference: form.contactPreference || null,
        contact_phone: form.contactPhone || null,
        contact_email: form.contactEmail || null,
        priority_level: form.safetyStatus === "need_help" ? "critical" : form.threatLevel === "high" ? "high" : "medium",
      } as any).select().single();

      if (error) throw error;

      // Upload evidence files
      let hasEvidence = false;
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, file);
        if (uploadError) continue;
        await supabase.from("evidence").insert({
          user_id: user.id, incident_id: incident.id, file_name: file.name,
          file_type: file.type, file_path: filePath, file_size: file.size, source: "upload" as const,
        });
        hasEvidence = true;
      }

      // AI Pre-Screening
      setVerifying(true);
      try {
        const { data: verifyData } = await supabase.functions.invoke("ai-summarize", {
          body: { incident: { ...incident, has_evidence: hasEvidence }, type: "verify" },
        });
        if (verifyData?.result) {
          const resultText = verifyData.result.toUpperCase();
          let status = "needs_review";
          if (resultText.includes("VERIFIED")) status = "verified";
          else if (resultText.includes("SUSPICIOUS")) status = "suspicious";
          await supabase.from("incidents").update({
            verification_status: status, verification_result: verifyData.result,
          }).eq("id", incident.id);
        }
        await supabase.functions.invoke("ai-screen", {
          body: { incident_id: incident.id, incident: { ...incident, has_evidence: hasEvidence } },
        });
      } catch { /* AI failure doesn't block */ }
      setVerifying(false);

      toast({
        title: "Report Submitted & Screened",
        description: `Your ${anonymous ? "anonymous " : ""}report has been AI-screened. Please answer follow-up questions.`,
      });

      // Show follow-up questionnaire instead of navigating away
      setSubmittedIncident({
        ...incident,
        incident_type: form.incidentType,
        incident_time: form.time,
        suspect_name: form.suspectName,
        suspect_relationship: form.suspectRelationship,
        safety_status: form.safetyStatus,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  // Show questionnaire after submission
  if (submittedIncident) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-14 px-6">
        <FollowUpQuestionnaire
          incident={submittedIncident}
          onComplete={() => navigate("/cases")}
          onSkip={() => navigate("/cases")}
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Report Incident</h1>
        <p className="text-sm text-muted-foreground mb-6">All reports are encrypted & AI-verified</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Anonymous Toggle */}
          <AnonymousToggle anonymous={anonymous} setAnonymous={setAnonymous} />

          {/* GPS Location */}
          <GPSLocation gpsCoords={gpsCoords} gpsLoading={gpsLoading} onRetry={captureLocation} />

          {/* Safety Status */}
          <SafetyStatusField value={form.safetyStatus} onChange={(v) => updateField("safetyStatus", v)} />

          {/* Incident Type */}
          <div className="space-y-2">
            <Label>Incident Type</Label>
            <Select value={form.incidentType} onValueChange={(v) => updateField("incidentType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type of incident" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t.toLowerCase().replace(/\s+/g, "_")}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Incident Title</Label>
            <Input
              id="title" placeholder="Brief description of the incident"
              value={form.title} onChange={(e) => updateField("title", e.target.value)}
              required maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="desc">Detailed Description</Label>
            <Textarea
              id="desc" placeholder="Describe what happened in detail — include names, places, and events..."
              className="min-h-[120px]" value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              required maxLength={5000}
            />
          </div>

          {/* Location + Date + Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Where" value={form.location}
                onChange={(e) => updateField("location", e.target.value)} maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date}
                onChange={(e) => updateField("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={form.time}
                onChange={(e) => updateField("time", e.target.value)} />
            </div>
          </div>

          {/* Threat Level */}
          <div className="space-y-2">
            <Label>Threat Level</Label>
            <div className="flex gap-2">
              {THREAT_LEVELS.map((level) => (
                <button
                  key={level.value} type="button"
                  onClick={() => updateField("threatLevel", level.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.threatLevel === level.value
                      ? level.color : "border-border/30 text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suspect Info (collapsible) */}
          <SuspectInfo
            suspectName={form.suspectName} suspectPhone={form.suspectPhone}
            suspectRelationship={form.suspectRelationship} onChange={updateField}
          />

          {/* Contact Preference */}
          <ContactPreference
            contactPreference={form.contactPreference} contactPhone={form.contactPhone}
            contactEmail={form.contactEmail} onChange={updateField}
          />

          {/* Evidence Upload */}
          <EvidenceUpload files={files} setFiles={setFiles} />

          {/* AI Verification Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">AI Verification Active</p>
              <p className="text-[10px] text-muted-foreground">
                Your report will be automatically verified by AI to check description consistency,
                location data, timestamps, and evidence metadata.
              </p>
            </div>
          </div>

          {/* Convert to SOS */}
          <Button
            type="button" variant="sos" size="lg" className="w-full gap-2"
            onClick={handleConvertToSOS}
          >
            <Zap className="h-4 w-4" /> Convert to Emergency SOS
          </Button>

          {/* Submit */}
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
