import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert, FileText, FolderOpen, MapPin, ClipboardList,
  LogOut, Bell, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthority } from "@/contexts/AuthorityContext";
import { supabase } from "@/integrations/supabase/client";
import AuthorityComplaints from "@/components/authority/AuthorityComplaints";
import AuthoritySOSAlerts from "@/components/authority/AuthoritySOSAlerts";
import AuthorityEvidence from "@/components/authority/AuthorityEvidence";
import AuthorityCaseManagement from "@/components/authority/AuthorityCaseManagement";
import AuthorityMap from "@/components/authority/AuthorityMap";
import AuthorityCaseChat from "@/components/authority/AuthorityCaseChat";

type DashboardView = "sos" | "complaints" | "evidence" | "cases" | "chat" | "map";

const AuthorityDashboard = () => {
  const navigate = useNavigate();
  const { authorityLogout } = useAuthority();
  const [activeView, setActiveView] = useState<DashboardView>("sos");
  const [sosCount, setSosCount] = useState(0);

  useEffect(() => {
    const fetchSos = async () => {
      const { data } = await supabase.from("sos_alerts").select("id, status");
      setSosCount((data || []).filter(a => a.status === "active").length);
    };
    fetchSos();
  }, []);

  const handleLogout = () => {
    authorityLogout();
    navigate("/login");
  };

  const navItems = [
    { id: "sos" as const, icon: ShieldAlert, label: "SOS", badge: sosCount },
    { id: "complaints" as const, icon: FileText, label: "Reports" },
    { id: "cases" as const, icon: ClipboardList, label: "Cases" },
    { id: "chat" as const, icon: MessageCircle, label: "Chat" },
    { id: "evidence" as const, icon: FolderOpen, label: "Evidence" },
    { id: "map" as const, icon: MapPin, label: "Map" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <ShieldAlert className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-foreground">
                Her<span className="text-primary">Net</span> Authority
              </h1>
              <p className="text-[10px] text-muted-foreground">Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground h-8 w-8">
              <Bell className="h-4 w-4" />
              {sosCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {sosCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-all rounded-lg relative",
                  isActive
                    ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]")} />
                <span className={cn(isActive && "font-semibold")}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px]">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="p-4 pb-24">
        {activeView === "sos" && <AuthoritySOSAlerts />}
        {activeView === "complaints" && <AuthorityComplaints />}
        {activeView === "evidence" && <AuthorityEvidence />}
        {activeView === "cases" && <AuthorityCaseManagement />}
        {activeView === "chat" && <AuthorityCaseChat />}
        {activeView === "map" && <AuthorityMap />}
      </div>
    </div>
  );
};

export default AuthorityDashboard;
