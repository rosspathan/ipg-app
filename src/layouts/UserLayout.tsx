import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Wallet, TrendingUp, Repeat, Users, User, Bell } from "lucide-react";

const UserLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/app/home", icon: Home, label: "Home" },
    { path: "/app/wallet", icon: Wallet, label: "Wallet" },
    { path: "/app/markets", icon: TrendingUp, label: "Markets" },
    { path: "/app/swap", icon: Repeat, label: "Swap" },
    { path: "/app/programs", icon: Users, label: "Programs" },
    { path: "/app/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/app/home") {
      return location.pathname === "/app" || location.pathname === "/app/home";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-card">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex flex-col h-12 w-16 gap-1 ${
                  isActive(item.path) 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserLayout;