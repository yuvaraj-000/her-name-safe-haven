import { Home, Shield, FileText, Users, Lock, Map, ClipboardList, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Shield, label: "SOS", path: "/sos" },
  { icon: FileText, label: "Report", path: "/report" },
  { icon: Lock, label: "Vault", path: "/vault" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const isSos = path === "/sos";
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors rounded-lg",
                isActive && !isSos && "text-primary",
                !isActive && !isSos && "text-muted-foreground hover:text-foreground",
                isSos && "text-sos font-bold"
              )}
            >
              <Icon className={cn("h-5 w-5", isSos && "h-6 w-6")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
