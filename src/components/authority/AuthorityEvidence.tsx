import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, FileImage, FileVideo, FileAudio, File, Download, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const fileIcon = (type: string) => {
  if (type.startsWith("image")) return <FileImage className="h-4 w-4 text-primary" />;
  if (type.startsWith("video")) return <FileVideo className="h-4 w-4 text-accent" />;
  if (type.startsWith("audio")) return <FileAudio className="h-4 w-4 text-warning" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const AuthorityEvidence = () => {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvidence = async () => {
    const { data } = await supabase.rpc("get_all_evidence");
    setEvidence(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvidence();

    // Realtime subscription for new evidence
    const channel = supabase
      .channel("authority-evidence-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evidence" },
        () => {
          fetchEvidence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("evidence").createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-safe" />
        Evidence Repository
      </h2>

      <div className="rounded-xl border border-border/30 p-3" style={{ background: "hsl(220 25% 12%)" }}>
        <div className="flex items-center gap-2 text-xs text-safe">
          <Shield className="h-3 w-3" />
          <span>All evidence files are hash-verified and tamper-proof</span>
        </div>
      </div>

      {evidence.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border/30 p-4"
          style={{ background: "hsl(220 25% 12%)" }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary/50 p-2.5">
              {fileIcon(item.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.file_name}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {format(new Date(item.created_at), "MMM d, HH:mm")}
                </span>
                <Badge variant="secondary" className="text-[9px] h-4">{item.file_type}</Badge>
                {item.file_size && <span>{(item.file_size / 1024).toFixed(1)} KB</span>}
              </div>
              {item.hash_sha256 && (
                <p className="mt-1 text-[9px] text-muted-foreground/60 font-mono truncate">
                  SHA-256: {item.hash_sha256}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
              onClick={() => handleDownload(item.file_path, item.file_name)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      ))}

      {evidence.length === 0 && (
        <div className="rounded-xl border border-border/30 p-8 text-center" style={{ background: "hsl(220 25% 12%)" }}>
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No evidence files uploaded</p>
        </div>
      )}
    </motion.div>
  );
};

export default AuthorityEvidence;
