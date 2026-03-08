import { Upload, Camera, FileVideo, Mic, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <Camera className="h-3 w-3" />;
  if (type.startsWith("video/")) return <FileVideo className="h-3 w-3" />;
  if (type.startsWith("audio/")) return <Mic className="h-3 w-3" />;
  return <Upload className="h-3 w-3" />;
};

const EvidenceUpload = ({ files, setFiles }: Props) => {
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>Evidence (Photos, Videos, Audio)</Label>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-primary/5">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Tap to upload photos, videos, or audio</span>
        <span className="text-[10px] text-muted-foreground/60">Evidence strengthens AI verification</span>
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-2.5 shadow-card">
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 rounded object-cover" />
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
  );
};

export default EvidenceUpload;
