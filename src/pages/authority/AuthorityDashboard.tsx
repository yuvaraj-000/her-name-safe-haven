import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert, FileText, UserX, FolderOpen, MapPin, ClipboardList,
  LogOut, Bell, AlertTriangle, Clock, TrendingUp, Users, Eye, ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthority } from "@/contexts/AuthorityContext";
import { supabase } from "@/integrations/supabase/client";
import AuthorityComplaints from "@/components/authority/AuthorityComplaints";
import AuthoritySOSAlerts from "@/components/authority/AuthoritySOSAlerts";
import AuthorityEvidence from "@/components/authority/AuthorityEvidence";
import AuthorityCaseManagement from "@/components/authority/AuthorityCaseManagement";
import AuthorityMap from "@/components/authority/AuthorityMap";
import AuthorityCaseChat from "@/components/authority/AuthorityCaseChat";

type DashboardView = "overview" | "sos" | "complaints" | "evidence" | "cases" | "chat" | "map";

const AuthorityDashboard = () => {
  const navigate = useNavigate();
  const { authorityLogout } = useAuthority();
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [stats, setStats] = useState({ sosAlerts: 0, complaints: 0, anonymous: 0, evidence: 0, activeCases: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [sosRes, incRes, evidRes] = await Promise.all([
        supabase.from("sos_alerts").select("id, status", { count: "exact" }),
        supabase.from("incidents").select("id, is_anonymous, status", { count: "exact" }),
        supabase.from("evidence").select("id", { count: "exact" }),
      ]);

      const sosData = sosRes.data || [];
      const incData = incRes.data || [];

      setStats({
        sosAlerts: sosData.filter(a => a.status === "active").length,
        complaints: incData.length,
        anonymous: incData.filter(i => i.is_anonymous).length,
        evidence: evidRes.count || 0,
        activeCases: incData.filter(i => i.status !== "resolved").length,
      });
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    authorityLogout();
    navigate("/login");
  };

  const navItems = [
    { id: "overview" as const, icon: TrendingUp, label: "Overview" },
    { id: "sos" as const, icon: ShieldAlert, label: "SOS Alerts", badge: stats.sosAlerts },
    { id: "complaints" as const, icon: FileText, label: "Complaints", badge: stats.complaints },
    { id: "evidence" as const, icon: FolderOpen, label: "Evidence" },
    { id: "cases" as const, icon: ClipboardList, label: "Cases" },
    { id: "chat" as const, icon: Bell, label: "Chat" },
    { id: "map" as const, icon: MapPin, label: "Live Map" },
  ];

  const statCards = [
    { label: "Active SOS", value: stats.sosAlerts, icon: ShieldAlert, color: "text-sos", bg: "bg-sos/10", urgent: stats.sosAlerts > 0 },
    { label: "Total Complaints", value: stats.complaints, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Anonymous Reports", value: stats.anonymous, icon: UserX, color: "text-warning", bg: "bg-warning/10" },
    { label: "Evidence Files", value: stats.evidence, icon: FolderOpen, color: "text-safe", bg: "bg-safe/10" },
    { label: "Active Cases", value: stats.activeCases, icon: ClipboardList, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(220 30% 6%), hsl(220 30% 10%))" }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border/30 px-4 py-3 backdrop-blur-xl" style={{ background: "hsl(220 30% 8% / 0.9)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">HerNet Authority</h1>
              <p className="text-[10px] text-muted-foreground">Police Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              {stats.sosAlerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sos text-[9px] font-bold text-sos-foreground">
                  {stats.sosAlerts}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="sticky top-[57px] z-40 border-b border-border/20 px-2 py-2 backdrop-blur-xl overflow-x-auto" style={{ background: "hsl(220 30% 8% / 0.8)" }}>
        <div className="flex gap-1 min-w-max">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeView === item.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[9px]">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeView === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Urgent Banner */}
            {stats.sosAlerts > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl border border-sos/30 bg-sos/10 p-4"
              >
                <AlertTriangle className="h-5 w-5 text-sos animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-sos">{stats.sosAlerts} Active Emergency Alert{stats.sosAlerts > 1 ? "s" : ""}</p>
                  <p className="text-xs text-sos/70">Immediate attention required</p>
                </div>
                <Button size="sm" variant="sos" onClick={() => setActiveView("sos")} className="text-xs">
                  View <ChevronRight className="h-3 w-3" />
                </Button>
              </motion.div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border border-border/30 p-4 ${card.urgent ? "border-sos/40 animate-pulse" : ""}`}
                  style={{ background: "hsl(220 25% 12%)" }}
                >
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border/30 p-4" style={{ background: "hsl(220 25% 12%)" }}>
              <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "View SOS Alerts", icon: ShieldAlert, view: "sos" as const, color: "text-sos" },
                  { label: "All Complaints", icon: FileText, view: "complaints" as const, color: "text-primary" },
                  { label: "Evidence Files", icon: FolderOpen, view: "evidence" as const, color: "text-safe" },
                  { label: "Live Map", icon: MapPin, view: "map" as const, color: "text-accent" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setActiveView(action.view)}
                    className="flex items-center gap-2 rounded-lg border border-border/20 bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                    <span className="text-xs font-medium text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

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
