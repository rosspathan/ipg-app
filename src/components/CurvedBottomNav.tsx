import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { Home, Wallet, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ipgLogo from "@/assets/ipg-logo.jpg";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const CurvedBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { path: "/app/home", icon: Home, label: "Home" },
    { path: "/app/wallet", icon: Wallet, label: "Wallet" },
    { path: "/app/markets", icon: TrendingUp, label: "Markets" },
    { path: "/app/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/app/home") {
      return location.pathname === "/app" || location.pathname === "/app/home";
    }
    return location.pathname.startsWith(path);
  };

  const handleFABPress = () => {
    // Navigate to main action (could be programs, spin wheel, etc.)
    navigate("/app/programs");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      {/* Glass background with curve */}
      <div className="relative">
        {/* Curved background */}
        <div className={cn(
          "glass-card bg-card-glass border border-border/30",
          "rounded-2xl shadow-elevated backdrop-blur-xl",
          "h-20 flex items-center justify-center",
          "relative overflow-hidden"
        )}>
          {/* Curved notch for FAB */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
            <div className="w-20 h-8 bg-transparent rounded-b-full border-t-0 border-l border-r border-border/30" />
          </div>

          {/* Navigation items */}
          <div className="flex items-center justify-around w-full px-6">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              // Add spacing for center FAB
              const isBeforeCenter = index < 2;
              const isAfterCenter = index >= 2;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "ripple flex flex-col items-center gap-1 h-16 px-3 rounded-xl",
                    "transition-all duration-normal",
                    isBeforeCenter && "mr-8",
                    isAfterCenter && index === 2 && "ml-8",
                    active 
                      ? "text-primary bg-primary/12 shadow-button" 
                      : "text-muted-foreground hover:text-primary hover:bg-muted/20"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-normal",
                    active ? "scale-110" : "scale-100"
                  )} />
                  <span className={cn(
                    "text-xs font-medium transition-all duration-normal",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Floating Action Button - Center */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6">
          <FloatingActionButton
            onClick={handleFABPress}
            className="animate-glow-pulse"
          >
            <img 
              src={ipgLogo}
              alt="IPG I-SMART Logo"
              className="w-10 h-10 object-contain rounded-full"
            />
          </FloatingActionButton>
        </div>
      </div>
    </div>
  );
};

export default CurvedBottomNav;