import * as React from "react";
import { Outlet } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogoBlink } from "./BrandLogoBlink";
import { DockAdmin } from "./DockAdmin";
import { Button } from "@/components/ui/button";

interface AdminShellAdaptiveProps {
  title?: string;
  className?: string;
}

/**
 * AdminShellAdaptive - Mobile-first admin shell
 * - Top header: BrandLogoBlink (left), title, search, notifications
 * - Bottom DockAdmin (mobile only)
 * - Collapsible rail on desktop (≥768px)
 * - Purple gradient background
 */
export function AdminShellAdaptive({ 
  title = "Admin Console", 
  className 
}: AdminShellAdaptiveProps) {
  return (
    <div
      data-testid="admin-shell"
      className={cn(
        "min-h-screen w-full",
        "bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]",
        className
      )}
    >
      {/* Top Header */}
      <header
        className={cn(
          "sticky top-0 z-40",
          "bg-[hsl(230_28%_13%/0.8)] backdrop-blur-xl",
          "border-b border-[hsl(225_24%_22%/0.16)]",
          "shadow-[0_8px_32px_-8px_hsl(245_35%_7%/0.4)]"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 gap-3">
          {/* Left: Logo */}
          <BrandLogoBlink />

          {/* Center: Title */}
          <h1 className="flex-1 text-lg font-heading font-bold text-foreground truncate">
            {title}
          </h1>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => console.log("Open search")}
            >
              <Search className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-foreground relative"
              onClick={() => console.log("Open notifications")}
            >
              <Bell className="w-5 h-5" />
              {/* Badge indicator */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom Dock (mobile only) */}
      <DockAdmin />
    </div>
  );
}
