import * as React from "react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users,
  Package, 
  LineChart, 
  Settings,
  Plus,
  Coins,
  Repeat,
  UserPlus,
  BarChart3,
  Cog
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
 * - 5 main tabs: Overview, Users, Programs, Markets, Settings
 * - Center "+" opens radial Quick Add menu
 * - Glass morphism with backdrop blur
 * - Sticky bottom on mobile, hidden on desktop with collapsible rail
 */
export function DockAdmin({ className }: DockAdminProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const navigate = useNavigate();

  const mainTabs = [
    { path: "/admin-nova", label: "Overview", icon: LayoutDashboard, exact: true },
    { path: "/admin-nova/users", label: "Users", icon: Users },
    { path: "/admin-nova/programs", label: "Programs", icon: Package },
    { path: "/admin-nova/markets", label: "Markets", icon: LineChart },
    { path: "/admin-nova/reports", label: "Reports", icon: BarChart3 },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "New Program",
      icon: Package,
      onClick: () => {
        navigate("/admin-nova/programs");
        setShowQuickAdd(false);
      },
    },
    {
      label: "List Token",
      icon: Coins,
      onClick: () => {
        navigate("/admin-nova/markets");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Manage Users",
      icon: UserPlus,
      onClick: () => {
        navigate("/admin-nova/users");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Settings",
      icon: Cog,
      onClick: () => {
        navigate("/admin-nova/settings");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Reports",
      icon: BarChart3,
      onClick: () => {
        navigate("/admin-nova/reports");
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
          "bg-[hsl(230_28%_13%/0.95)] backdrop-blur-xl",
          "border-t border-[hsl(225_24%_22%/0.16)]",
          "shadow-[0_-8px_32px_-8px_hsl(245_35%_7%/0.6)]",
          "pb-[env(safe-area-inset-bottom)]",
          className
        )}
      >
        <div className="flex items-center justify-around h-20 px-3 relative">
          {/* Left tabs (2) */}
          {mainTabs.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1.5 px-3 py-2 min-w-[64px]",
                  "rounded-2xl transition-all duration-[120ms]",
                  "text-xs font-medium touch-manipulation",
                  "active:scale-95",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-6 h-6 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="text-[11px]">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center Quick Add button */}
          <button
            data-testid="admin-dock-center"
            onClick={() => setShowQuickAdd(true)}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-7",
              "w-16 h-16 rounded-full",
              "bg-gradient-to-br from-primary to-secondary",
              "shadow-[0_0_32px_-4px_hsl(262_100%_65%/0.7)]",
              "flex items-center justify-center",
              "transition-transform duration-[120ms]",
              "active:scale-90 touch-manipulation",
              "focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none",
              "border-4 border-[hsl(230_28%_13%)]"
            )}
          >
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>

          {/* Right tabs (3) */}
          {mainTabs.slice(2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1.5 px-3 py-2 min-w-[64px]",
                  "rounded-2xl transition-all duration-[120ms]",
                  "text-xs font-medium touch-manipulation",
                  "active:scale-95",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-6 h-6 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="text-[11px]">{tab.label}</span>
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
          className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)] pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader>
            <SheetTitle className="font-heading text-lg">Quick Actions</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-6 pb-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-5",
                  "rounded-2xl border border-[hsl(225_24%_22%/0.16)]",
                  "bg-[hsl(229_30%_16%/0.5)] backdrop-blur",
                  "transition-all duration-[120ms]",
                  "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                  "active:scale-95 touch-manipulation",
                  "min-h-[100px]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center leading-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
