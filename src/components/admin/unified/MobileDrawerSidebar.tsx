import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import {
  LayoutDashboard, Users, FolderKanban, TrendingUp, Settings, Shield,
  Wallet, FileText, DollarSign, Bell, BarChart3, Database, Coins,
  Crown, AlertTriangle, Link as LinkIcon, Activity, ClipboardList, Key,
  ChevronDown, X, FileBarChart, ScrollText, Download,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Programs", url: "/admin/programs", icon: FolderKanban },
  { title: "Markets", url: "/admin/markets", icon: TrendingUp },
  { title: "Trading Engine", url: "/admin/trading-engine", icon: Activity },
  { title: "Trading Orders", url: "/admin/trading-orders", icon: ClipboardList },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
];

const managementNav: NavItem[] = [
  { title: "Program Control", url: "/admin/programs/control", icon: FolderKanban },
  { title: "KYC Reviews", url: "/admin/kyc-review", icon: Shield, badge: 12 },
  { title: "BSK Management", url: "/admin/bsk", icon: Coins },
  { title: "BSK Wallet Adjust", url: "/admin/bsk-wallet-adjustment", icon: Wallet },
  { title: "BSK Ledger", url: "/admin/bsk-ledger", icon: Database },
  { title: "BSK Reconciliation", url: "/admin/bsk-reconciliation", icon: BarChart3 },
  { title: "Withdrawals", url: "/admin/bsk-withdrawals", icon: Wallet, badge: 5 },
  { title: "Insurance", url: "/admin/insurance", icon: FileText },
  { title: "Loans", url: "/admin/bsk-loans", icon: DollarSign },
  { title: "Badges", url: "/admin/badges", icon: Crown },
];

const systemNav: NavItem[] = [
  { title: "Missing Referrals", url: "/admin/missing-referrals", icon: LinkIcon },
  { title: "BSK Migration Audit", url: "/admin/bsk-migration-audit", icon: Activity },
  { title: "Announcements", url: "/admin/announcements", icon: Bell },
  { title: "System Health", url: "/admin/system-health", icon: Database },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: FileText },
  { title: "Orphaned Users", url: "/admin/orphaned-users-cleanup", icon: AlertTriangle },
  { title: "Hot Wallet", url: "/admin/generate-hot-wallet", icon: Key },
  { title: "Migration Wallet", url: "/admin/migration-hot-wallet", icon: Coins },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const reportsNav: NavItem[] = [
  { title: "Migration Reports", url: "/admin/bsk-migration-reports", icon: FileBarChart },
  { title: "Loan Reports", url: "/admin/bsk-loan-reports", icon: ScrollText },
  { title: "Loan Audit", url: "/admin/loan-audit", icon: BarChart3 },
  { title: "Export Center", url: "/admin/reports", icon: Download },
];

interface SectionProps {
  label: string;
  items: NavItem[];
  location: ReturnType<typeof useLocation>;
  onNavigate: (url: string) => void;
  defaultOpen?: boolean;
}

function NavSection({ label, items, location, onNavigate, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const isActive = (item: NavItem) =>
    item.url === "/admin"
      ? location.pathname === "/admin" || location.pathname === "/admin/dashboard"
      : location.pathname.startsWith(item.url);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(240_10%_45%)] hover:text-[hsl(240_10%_65%)] transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {open && (
        <div className="space-y-0.5 pb-1">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.url}
                onClick={() => onNavigate(item.url)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 min-h-[48px] text-left",
                  active
                    ? "bg-[hsl(262_100%_65%/0.14)] text-[hsl(262_100%_72%)] font-semibold"
                    : "text-[hsl(240_10%_65%)] hover:text-[hsl(0_0%_95%)] hover:bg-[hsl(235_28%_18%)]"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-sm leading-tight">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto flex-shrink-0 bg-[hsl(0_70%_60%)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MobileDrawerSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawerSidebar({ open, onClose }: MobileDrawerSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (url: string) => {
    onClose();
    navigate(url);
  };

  // Close on escape key
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen w-72 z-[70] lg:hidden",
          "bg-[hsl(235_28%_11%)] border-r border-[hsl(235_20%_22%/0.20)]",
          "flex flex-col shadow-2xl shadow-black/60",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[hsl(235_20%_22%/0.20)] shrink-0">
          <div>
            <BrandLogoBlink />
            <p className="text-[10px] text-[hsl(240_10%_50%)] mt-0.5 font-medium tracking-wide uppercase">
              Admin Console
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_95%)] hover:bg-[hsl(235_28%_18%)] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-[hsl(235_20%_22%)] scrollbar-track-transparent"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <NavSection
            label="Main"
            items={mainNav}
            location={location}
            onNavigate={handleNavigate}
            defaultOpen={true}
          />
          <NavSection
            label="Management"
            items={managementNav}
            location={location}
            onNavigate={handleNavigate}
            defaultOpen={true}
          />
          <NavSection
            label="BSK Reports"
            items={reportsNav}
            location={location}
            onNavigate={handleNavigate}
            defaultOpen={false}
          />
        </div>
      </div>
    </>
  );
}

