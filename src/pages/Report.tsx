import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Send, ShieldCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Report = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", date: "" });
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Create incident
      const { data: incident, error } = await supabase.from("incidents").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        location: form.location || null,
        incident_date: form.date ? new Date(form.date).toISOString() : null,
        is_anonymous: anonymous,
      }).select().single();

      if (error) throw error;

      // Upload evidence files
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
      }

      toast({
        title: "Report Submitted",
        description: anonymous
          ? "Your anonymous report has been securely submitted."
          : "Your report has been securely submitted.",
      });
      navigate("/cases");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Report Incident</h1>
        <p className="text-sm text-muted-foreground mb-6">All reports are encrypted end-to-end</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="space-y-2">
            <Label htmlFor="title">Incident Title</Label>
            <Input id="title" placeholder="Brief description of the incident" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Detailed Description</Label>
            <Textarea id="desc" placeholder="Describe what happened..." className="min-h-[120px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Where it happened" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Evidence (Optional)</Label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-primary/5">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {files.length > 0 ? `${files.length} file(s) selected` : "Tap to upload photos, videos, or audio"}
              </span>
              <input type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full gap-2" disabled={loading}>
            <Send className="h-4 w-4" /> {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </motion.div>
      <BottomNav />
    </div>
  );
};

export default Report;
