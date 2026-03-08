import { useSOS } from "@/contexts/SOSContext";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Maximize2, Minimize2 } from "lucide-react";

const SOSCameraPreview = () => {
  const { active, isRecording, videoStream, elapsedSeconds } = useSOS();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [videoStream]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {active && isRecording && videoStream && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className={`fixed z-[9998] shadow-2xl rounded-2xl overflow-hidden border-2 border-sos/60 ${
            expanded
              ? "bottom-24 left-4 right-4 aspect-video"
              : "bottom-24 right-4 w-32 h-44"
          } transition-all duration-300`}
          drag={!expanded}
          dragConstraints={{ left: -300, right: 0, top: -400, bottom: 0 }}
        >
          {/* Video feed */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover bg-black"
          />

          {/* Overlay controls */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sos animate-pulse" />
              <span className="text-[10px] font-mono text-white/90">REC {formatTime(elapsedSeconds)}</span>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full bg-black/30 text-white/80 hover:bg-black/50 transition-colors"
            >
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </button>
          </div>

          {/* Bottom label */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1 bg-gradient-to-t from-black/60 to-transparent">
            <Video className="h-3 w-3 text-sos" />
            <span className="text-[9px] font-semibold text-white/80">Evidence Recording</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SOSCameraPreview;
