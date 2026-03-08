import { motion } from "framer-motion";
import { User, Shield, Bell, Lock, Info } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const menuItems = [
  { icon: User, label: "Personal Information", desc: "Name, email, phone" },
  { icon: Shield, label: "Safety Settings", desc: "SOS timer, auto-record" },
  { icon: Bell, label: "Notifications", desc: "Alert preferences" },
  { icon: Lock, label: "Privacy & Security", desc: "Encryption, data control" },
  { icon: Info, label: "About HerName", desc: "Version 1.0" },
];

const Profile = () => {
  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-display font-bold text-primary-foreground shadow-soft">
          H
        </div>
        <h1 className="mt-3 font-display text-xl font-bold text-foreground">HerName User</h1>
        <p className="text-sm text-muted-foreground">Safety is your right</p>
      </motion.div>

      <div className="space-y-2">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex w-full items-center gap-3 rounded-xl bg-card p-4 shadow-card text-left transition-all hover:shadow-soft active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
