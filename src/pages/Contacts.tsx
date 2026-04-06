import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import EmergencyContactsManager from "@/components/profile/EmergencyContactsManager";

const Contacts = () => {
  return (
    <div className="min-h-screen bg-background pb-24 pt-14 px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Trusted Contacts</h1>
          <p className="text-sm text-muted-foreground">Your emergency safety network</p>
        </div>
      </motion.div>

      <EmergencyContactsManager />

      <BottomNav />
    </div>
  );
};

export default Contacts;
