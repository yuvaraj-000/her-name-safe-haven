import { Home, Lock, Map, ClipboardList, Phone, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: ClipboardList, label: "Cases", path: "/cases" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Lock, label: "Vault", path: "/vault" },
  { icon: Map, label: "Map", path: "/safety-map" },
  { icon: Phone, label: "Help", path: "/helplines" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-all rounded-lg",
                isActive
                  ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]")} />
              <span className={cn(isActive && "font-semibold")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
