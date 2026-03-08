import { motion } from "framer-motion";
import { Phone, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const helplines = [
  { name: "Women Helpline", number: "181", desc: "24/7 Women Helpline (All India)" },
  { name: "Police", number: "100", desc: "Emergency Police Help" },
  { name: "Ambulance", number: "102", desc: "Medical Emergency" },
  { name: "National Commission for Women", number: "7827-170-170", desc: "NCW WhatsApp Helpline" },
  { name: "Domestic Abuse", number: "181", desc: "Women in Distress" },
  { name: "Child Helpline", number: "1098", desc: "Child Abuse & Protection" },
];

const Helplines = () => {
  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Emergency Helplines</h1>
      <p className="text-sm text-muted-foreground mb-6">Tap to call directly</p>

      <div className="space-y-3">
        {helplines.map((h, i) => (
          <motion.a
            key={h.number + i}
            href={`tel:${h.number}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sos/10 text-sos">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{h.number}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </motion.a>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Helplines;
