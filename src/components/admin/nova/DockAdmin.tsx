import * as React from "react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  FileText, 
  Settings,
  Plus,
  Coins,
  Repeat,
  Gift,
  Megaphone,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface DockAdminProps {
  className?: string;
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

/**
 * DockAdmin - Bottom glass dock navigation with center Quick Add
 * - 5 main tabs: Overview, Catalog, Programs, Reports, Settings
 * - Center "+" opens radial Quick Add menu
 * - Glass morphism with backdrop blur
 * - Sticky bottom on mobile, hidden on desktop with collapsible rail
 */
export function DockAdmin({ className }: DockAdminProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const tabs = [
    { path: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { path: "/admin/catalog", label: "Catalog", icon: Package },
    { path: "/admin/programs", label: "Programs", icon: TrendingUp },
    { path: "/admin/reports", label: "Reports", icon: FileText },
    { path: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "List Token",
      icon: Coins,
      onClick: () => {
        console.log("List Token");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Create Pair",
      icon: Repeat,
      onClick: () => {
        console.log("Create Pair");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Start Draw",
      icon: Gift,
      onClick: () => {
        console.log("Start Draw");
        setShowQuickAdd(false);
      },
    },
    {
      label: "New Ad",
      icon: Megaphone,
      onClick: () => {
        console.log("New Ad");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Set Fee Rule",
      icon: DollarSign,
      onClick: () => {
        console.log("Set Fee Rule");
        setShowQuickAdd(false);
      },
    },
  ];

  return (
    <>
      <nav
        data-testid="admin-dock"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "md:hidden", // Hide on desktop
          "bg-[hsl(230_28%_13%/0.8)] backdrop-blur-xl",
          "border-t border-[hsl(225_24%_22%/0.16)]",
          "shadow-[0_-8px_32px_-8px_hsl(245_35%_7%/0.6)]",
          className
        )}
      >
        <div className="flex items-center justify-around h-16 px-2 relative">
          {/* Left tabs (2) */}
          {tabs.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-1",
                  "rounded-xl transition-all duration-[120ms]",
                  "text-xs font-medium",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center Quick Add button */}
          <button
            data-testid="admin-dock-center"
            onClick={() => setShowQuickAdd(true)}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6",
              "w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-secondary",
              "shadow-[0_0_24px_-6px_hsl(262_100%_65%/0.6)]",
              "flex items-center justify-center",
              "transition-transform duration-[120ms]",
              "hover:scale-110 active:scale-95",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            )}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>

          {/* Right tabs (3) */}
          {tabs.slice(2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-1",
                  "rounded-xl transition-all duration-[120ms]",
                  "text-xs font-medium",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Add Sheet */}
      <Sheet open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <SheetContent
          side="bottom"
          className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]"
        >
          <SheetHeader>
            <SheetTitle className="font-heading">Quick Add</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4",
                  "rounded-2xl border border-[hsl(225_24%_22%/0.16)]",
                  "bg-[hsl(229_30%_16%/0.5)] backdrop-blur",
                  "transition-all duration-[120ms]",
                  "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                  "active:scale-95"
                )}
              >
                <action.icon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
