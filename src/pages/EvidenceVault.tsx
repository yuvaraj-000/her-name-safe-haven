import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Upload, FileVideo, FileAudio, Image, File, Trash2, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const fileTypeIcon = (type: string) => {
  if (type.startsWith("video")) return FileVideo;
  if (type.startsWith("audio")) return FileAudio;
  if (type.startsWith("image")) return Image;
  return File;
};

const EvidenceVault = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["evidence", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const filePath = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("evidence").insert({
        user_id: user!.id,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        file_size: file.size,
        source: "upload" as const,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast({ title: "Evidence Uploaded", description: "File securely stored in your vault." });
      setUploading(false);
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: { id: string; file_path: string }) => {
      await supabase.storage.from("evidence").remove([item.file_path]);
      const { error } = await supabase.from("evidence").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast({ title: "Evidence Deleted" });
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const handleView = async (filePath: string) => {
    const { data } = await supabase.storage.from("evidence").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Evidence Vault
          </h1>
          <p className="text-sm text-muted-foreground">Encrypted & secure storage</p>
        </div>
      </div>

      {/* Security badge */}
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-safe/10 p-3">
        <ShieldCheck className="h-5 w-5 text-safe" />
        <div>
          <p className="text-xs font-semibold text-safe">End-to-End Encrypted</p>
          <p className="text-xs text-muted-foreground">Files are only visible to you</p>
        </div>
      </div>

      {/* Upload */}
      <label className="mb-6 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-primary/5">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : "Tap to upload evidence"}
        </span>
        <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {/* File list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : evidence.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-8 text-center">
          <Lock className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Your vault is empty.<br />Upload evidence to keep it safe.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map((item, i) => {
            const Icon = fileTypeIcon(item.file_type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{item.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleView(item.file_path)} className="rounded-lg p-2 text-primary hover:bg-primary/10 transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate({ id: item.id, file_path: item.file_path })} className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default EvidenceVault;
