import * as React from "react";
import { Outlet } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogoBlink } from "./BrandLogoBlink";
import { DockAdmin } from "./DockAdmin";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminHeaderMobile } from "./AdminHeaderMobile";

interface AdminShellAdaptiveProps {
  title?: string;
  className?: string;
}

/**
 * AdminShellAdaptive - Unified admin shell
 * - All devices: Bottom DockAdmin navigation
 * - Top header: BrandLogoBlink, title, search, notifications
 * - Purple gradient background
 * - Full-width content for maximum space
 */
export function AdminShellAdaptive({ 
  title = "Admin Console", 
  className 
}: AdminShellAdaptiveProps) {
  const commandPalette = useCommandPalette();
  const isMobile = useIsMobile();

  return (
    <div
      data-testid="admin-shell"
      className={cn(
        "min-h-screen w-full flex flex-col",
        "bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]",
        className
      )}
    >
      {/* Conditional Header - Mobile vs Desktop */}
      {isMobile ? (
        <AdminHeaderMobile 
          title={title}
          onSearchClick={() => commandPalette.toggle()}
        />
      ) : (
        <>
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
              <div className="flex items-center gap-3">
                <BrandLogoBlink />
              </div>

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
                  onClick={() => commandPalette.toggle()}
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

          {/* Breadcrumb Navigation */}
          <BreadcrumbNav />
        </>
      )}

      {/* Main Content - Full Width */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Bottom Dock (all devices) */}
      <DockAdmin />

      {/* Command Palette (⌘K) */}
      <CommandPalette open={commandPalette.open} onOpenChange={commandPalette.setOpen} />
    </div>
  );
}
