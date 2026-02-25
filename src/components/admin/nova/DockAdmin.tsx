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
  Cog,
  Gift,
  Shield,
  Megaphone,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Ticket,
  CreditCard,
  HandCoins,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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
    { path: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/programs", label: "Programs", icon: Package },
    { path: "/admin/markets", label: "Markets", icon: LineChart },
    { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "KYC Review",
      icon: Shield,
      onClick: () => {
        navigate("/admin/kyc-review");
        setShowQuickAdd(false);
      },
    },
    {
      label: "New Program",
      icon: Package,
      onClick: () => {
        navigate("/admin/programs");
        setShowQuickAdd(false);
      },
    },
    {
      label: "List Token",
      icon: Coins,
      onClick: () => {
        navigate("/admin/markets");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Manage Users",
      icon: UserPlus,
      onClick: () => {
        navigate("/admin/users");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Lucky Draw",
      icon: Ticket,
      onClick: () => {
        navigate("/admin/lucky-draw");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Spin Wheel",
      icon: RefreshCw,
      onClick: () => {
        navigate("/admin/spin");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Insurance",
      icon: Shield,
      onClick: () => {
        navigate("/admin/insurance");
        setShowQuickAdd(false);
      },
    },
    {
      label: "BSK Loans",
      icon: HandCoins,
      onClick: () => {
        navigate("/admin/bsk-loans");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Staking",
      icon: TrendingUp,
      onClick: () => {
        navigate("/admin/staking");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Purchase Bonus",
      icon: DollarSign,
      onClick: () => {
        navigate("/admin/purchase-bonus");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Referrals",
      icon: UserPlus,
      onClick: () => {
        navigate("/admin/referrals");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Funding",
      icon: DollarSign,
      onClick: () => {
        navigate("/admin/funding");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Fee Collections",
      icon: Receipt,
      onClick: () => {
        navigate("/admin/fee-collections");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Trading Recon",
      icon: Shield,
      onClick: () => {
        navigate("/admin/trading-reconciliation");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Trading Report",
      icon: BarChart3,
      onClick: () => {
        navigate("/admin/trading-full-report");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Ads",
      icon: Megaphone,
      onClick: () => {
        navigate("/admin/ads");
        setShowQuickAdd(false);
      },
    },
    {
      label: "Subscriptions",
      icon: CreditCard,
      onClick: () => {
        navigate("/admin/subscriptions");
        setShowQuickAdd(false);
      },
    },
  ];

  return (
    <>
      <nav
        data-testid="admin-dock"
        className={cn(
          "mobile-fixed z-50",
          "bg-[hsl(230_28%_13%/0.98)] backdrop-blur-xl",
          "border-t border-[hsl(225_24%_22%/0.16)]",
          "shadow-[0_-4px_24px_-8px_hsl(245_35%_7%/0.6)]",
          className
        )}
        style={{
          bottom: 'max(env(safe-area-inset-bottom), var(--vvb, 0px), 12px)',
          paddingBottom: '8px',
          paddingLeft: 'calc(env(safe-area-inset-left) + 0.25rem)',
          paddingRight: 'calc(env(safe-area-inset-right) + 0.25rem)',
        }}
      >
        <div className="flex items-center justify-around h-16 sm:h-20 px-1 sm:px-2 md:px-3 relative max-w-screen-xl mx-auto">
          {/* Left tabs (2) */}
          {mainTabs.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 sm:gap-1.5",
                  "px-2 sm:px-3 py-2 min-w-[60px] sm:min-w-[70px]",
                  "rounded-2xl transition-all duration-[120ms]",
                  "text-[10px] sm:text-xs font-medium touch-manipulation",
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
                      "w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="text-[10px] sm:text-[11px] leading-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center Quick Add button */}
          <button
            data-testid="admin-dock-center"
            onClick={() => setShowQuickAdd(true)}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-7",
              "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
              "bg-gradient-to-br from-primary to-secondary",
              "shadow-[0_0_32px_-4px_hsl(262_100%_65%/0.7)]",
              "flex items-center justify-center",
              "transition-transform duration-[120ms]",
              "active:scale-90 touch-manipulation",
              "focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none",
              "border-[3px] sm:border-4 border-[hsl(230_28%_13%)]"
            )}
          >
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
          </button>

          {/* Right tabs (3) */}
          {mainTabs.slice(2).map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 sm:gap-1.5",
                  "px-2 sm:px-3 py-2 min-w-[60px] sm:min-w-[70px]",
                  "rounded-2xl transition-all duration-[120ms]",
                  "text-[10px] sm:text-xs font-medium touch-manipulation",
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
                      "w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-[120ms]",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="text-[10px] sm:text-[11px] leading-tight">{tab.label}</span>
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
          className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)] h-[88dvh] sm:max-h-[80vh] overflow-y-auto rounded-t-3xl"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'
          }}
        >
      <SheetHeader>
        <SheetTitle className="font-heading text-base sm:text-lg">Quick Actions</SheetTitle>
        <SheetDescription className="sr-only">Admin quick actions grid. Choose an action to navigate.</SheetDescription>
      </SheetHeader>
          
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 mt-3 sm:mt-6 pb-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 sm:gap-3",
                  "p-3 sm:p-5",
                  "rounded-xl border border-[hsl(225_24%_22%/0.16)]",
                  "bg-[hsl(229_30%_16%/0.5)] backdrop-blur",
                  "transition-all duration-[120ms]",
                  "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                  "active:scale-95 touch-manipulation",
                  "min-h-[72px] sm:min-h-[100px]",
                  "min-w-[44px]" // Ensures touch target
                )}
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-center leading-tight px-1">
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
