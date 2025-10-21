import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BrandLogoBlink } from "./BrandLogoBlink";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavigate, useLocation } from "react-router-dom";

interface AdminHeaderMobileProps {
  title?: string;
  onSearchClick?: () => void;
}

export function AdminHeaderMobile({ 
  title = "Admin Console",
  onSearchClick 
}: AdminHeaderMobileProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Users", path: "/admin/users" },
    { label: "Programs", path: "/admin/programs" },
    { label: "Markets", path: "/admin/markets" },
    { label: "Reports", path: "/admin/reports" },
  ];

  return (
    <header className="mobile-sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <BrandLogoBlink className="h-8" />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-col">
            <BrandLogoBlink className="h-6" />
            <span className="text-xs text-muted-foreground">{title}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onSearchClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={onSearchClick}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <NotificationBell size="sm" />
        </div>
      </div>
    </header>
  );
}
