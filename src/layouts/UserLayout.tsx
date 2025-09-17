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
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20">
        <Outlet />
      </div>

      {/* Android-style Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-50">
        <div className="flex h-18 items-center justify-around px-1 max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`ripple flex flex-col h-16 flex-1 gap-1 rounded-lg transition-all duration-200 ${
                  active 
                    ? "text-primary bg-primary/12 shadow-button" 
                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                }`}
              >
                <Icon className={`h-5 w-5 transition-all duration-200 ${
                  active ? "scale-110" : "scale-100"
                }`} />
                <span className={`text-xs font-medium transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserLayout;