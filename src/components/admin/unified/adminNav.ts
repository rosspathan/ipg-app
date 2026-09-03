import {
  LayoutDashboard,
  Users,
  FolderKanban,
  TrendingUp,
  Settings,
  Shield,
  Wallet,
  FileText,
  DollarSign,
  Bell,
  BarChart3,
  Database,
  Coins,
  Gift,
  Crown,
  AlertTriangle,
  Link as LinkIcon,
  Activity,
  ClipboardList,
  Key,
  FileBarChart,
  ScrollText,
  Download,
  Unlock,
  ShieldAlert,
  Layers,
  Sparkles,
  Send,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  Image as ImageIcon,
  Megaphone,
  UserCheck,
  UserCog,
  UserX,
  Network,
  Percent,
  Award,
  Boxes,
  Smartphone,
  Wrench,
  Bug,
  Trash2,
  FlaskConical,
  Landmark,
  Banknote,
  ListChecks,
  Gauge,
  Search,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  keywords?: string[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

/**
 * Single source of truth for admin navigation.
 * Every routed admin page lives in exactly one group below.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, keywords: ["home", "overview"] },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "System Health", url: "/admin/system/health", icon: Gauge },
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
      { title: "Carousel", url: "/admin/carousel", icon: ImageIcon },
      { title: "Ads", url: "/admin/ads", icon: Bell },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    items: [
      { title: "Token Management", url: "/admin/tokens", icon: Coins, keywords: ["assets", "add token", "listing"] },
      { title: "Markets", url: "/admin/markets", icon: TrendingUp, keywords: ["pairs", "price floor"] },
      { title: "Trading Engine", url: "/admin/trading-engine", icon: Activity },
      { title: "Trading Orders", url: "/admin/trading-orders", icon: ClipboardList },
      { title: "Trading Reconciliation", url: "/admin/trading-reconciliation", icon: Shield },
      { title: "Trading Full Report", url: "/admin/trading-full-report", icon: FileText },
      { title: "Forensic Audit", url: "/admin/trading-forensic", icon: Search },
      { title: "Fee Dashboard", url: "/admin/fees", icon: Percent },
      { title: "Fee Collections", url: "/admin/fee-collections", icon: Banknote },
      { title: "Fees (Simple)", url: "/admin/fees-simple", icon: Percent },
      { title: "Currency Control", url: "/admin/currency", icon: Repeat },
      { title: "IPG Staking", url: "/admin/ipg-staking", icon: Layers },
      { title: "Staking", url: "/admin/staking", icon: Layers },
    ],
  },
  {
    id: "wallets",
    label: "Wallets",
    icon: Wallet,
    items: [
      { title: "Hot Wallet Live", url: "/admin/hot-wallet-live", icon: Activity },
      { title: "Hot Wallet Audit", url: "/admin/hot-wallet-audit", icon: Shield },
      { title: "Hot Wallet Solvency", url: "/admin/hot-wallet-solvency", icon: ShieldAlert },
      { title: "Generate Hot Wallet", url: "/admin/generate-hot-wallet", icon: Key },
      { title: "Staking Wallet", url: "/admin/staking-wallet", icon: Landmark },
      { title: "Migration Wallet", url: "/admin/migration-hot-wallet", icon: Coins },
      { title: "Crypto Withdrawals", url: "/admin/crypto-withdrawals", icon: ArrowUpFromLine, keywords: ["pending withdrawals"] },
      { title: "Crypto Conversions", url: "/admin/crypto-conversions", icon: Repeat },
      { title: "Transactions", url: "/admin/transactions", icon: History },
      { title: "Funding", url: "/admin/funding", icon: ArrowDownToLine },
      { title: "Phantom Accounts", url: "/admin/phantom-report", icon: AlertTriangle },
    ],
  },
  {
    id: "bsk",
    label: "BSK Operations",
    icon: Coins,
    items: [
      { title: "BSK Management", url: "/admin/bsk", icon: Coins },
      { title: "BSK Management (Nova)", url: "/admin/bsk-management", icon: Coins },
      { title: "BSK Send", url: "/admin/bsk-send", icon: Send },
      { title: "BSK Transfer History", url: "/admin/bsk-transfer-history", icon: History },
      { title: "BSK Withdrawals", url: "/admin/bsk-withdrawals", icon: ArrowUpFromLine },
      { title: "BSK Wallet Adjustment", url: "/admin/bsk-wallet-adjustment", icon: Wallet },
      { title: "BSK Ledger", url: "/admin/bsk-ledger", icon: Database },
      { title: "BSK Ledger (Complete)", url: "/admin/bsk-ledger-complete", icon: Database },
      { title: "BSK Reconciliation", url: "/admin/bsk-reconciliation", icon: BarChart3 },
      { title: "Manual Purchases", url: "/admin/bsk-manual-purchases", icon: ClipboardList },
      { title: "Purchase Bonus", url: "/admin/purchase-bonus", icon: Gift },
      { title: "One-Time Offers", url: "/admin/one-time-offers", icon: Sparkles },
      { title: "Offer Purchase History", url: "/admin/offer-purchase-history", icon: History },
      { title: "BSK Global Unlock", url: "/admin/bsk-global-unlock", icon: Unlock },
      { title: "Migration Control", url: "/admin/migration-control", icon: Shield },
      { title: "Migration Audit", url: "/admin/bsk-migration-audit", icon: Activity },
      { title: "Migration Settings", url: "/admin/bsk-migration-settings", icon: Settings },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    items: [
      { title: "All Users", url: "/admin/users", icon: Users },
      { title: "Users (Nova)", url: "/admin/users-nova", icon: Users },
      { title: "Users (Clean)", url: "/admin/users-clean", icon: Users },
      { title: "User Financials", url: "/admin/users/financial", icon: DollarSign },
      { title: "KYC Review", url: "/admin/kyc-review", icon: UserCheck },
      { title: "KYC Legacy", url: "/admin/kyc/legacy", icon: UserCheck },
      { title: "KYC Settings", url: "/admin/kyc/settings", icon: Settings },
      { title: "Verified Users", url: "/admin/kyc/verified", icon: UserCheck },
      { title: "Roles", url: "/admin/roles", icon: UserCog },
      { title: "Badges", url: "/admin/badges", icon: Crown },
      { title: "Badge Qualification", url: "/admin/badge-qualification", icon: Award },
      { title: "Badge Commissions", url: "/admin/badge-commissions", icon: Percent },
      { title: "VIP Milestones", url: "/admin/vip-milestones", icon: Crown },
      { title: "Subscriptions", url: "/admin/subscriptions", icon: ListChecks },
      { title: "Referrals", url: "/admin/referrals", icon: Network },
      { title: "50-Level Referrals", url: "/admin/50-level-referrals", icon: Network },
      { title: "Manual Referral Assignment", url: "/admin/manual-referral-assignment", icon: LinkIcon },
      { title: "Missing Referrals", url: "/admin/missing-referrals", icon: LinkIcon },
      { title: "Tree Health", url: "/admin/tree-health", icon: Network },
      { title: "Retroactive Commission Fix", url: "/admin/retroactive-commission-fix", icon: Wrench },
      { title: "Referral Debugger", url: "/admin/referral-debugger", icon: Bug },
      { title: "User Cleanup", url: "/admin/user-cleanup", icon: UserX },
      { title: "Orphaned Users", url: "/admin/orphaned-users-cleanup", icon: UserX },
      { title: "Test User Generator", url: "/admin/test-user-generator", icon: FlaskConical },
    ],
  },
  {
    id: "loans",
    label: "Loans & Insurance",
    icon: DollarSign,
    items: [
      { title: "BSK Loans", url: "/admin/bsk-loans", icon: DollarSign },
      { title: "Loan Audit", url: "/admin/loan-audit", icon: BarChart3 },
      { title: "Loan Reports", url: "/admin/bsk-loan-reports", icon: ScrollText },
      { title: "Insurance", url: "/admin/insurance", icon: Shield },
      { title: "Programs", url: "/admin/programs", icon: FolderKanban },
      { title: "Program Control", url: "/admin/programs/control", icon: Boxes },
      { title: "Program Control Center", url: "/admin/programs/control-center", icon: Boxes },
      { title: "Program Templates", url: "/admin/programs/templates", icon: FolderKanban },
      { title: "Program Config", url: "/admin/programs/config", icon: Settings },
      { title: "Program Economics", url: "/admin/programs/economics", icon: DollarSign },
      { title: "Spin Wheel", url: "/admin/spin", icon: Sparkles },
      { title: "Lucky Draw", url: "/admin/lucky-draw", icon: Gift },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileBarChart,
    items: [
      { title: "Export Center", url: "/admin/reports", icon: Download },
      { title: "Program Analytics", url: "/admin/programs/analytics", icon: BarChart3 },
      { title: "Economics Analytics", url: "/admin/programs/economics/analytics", icon: BarChart3 },
      { title: "BSK Forensic Audit", url: "/admin/bsk-forensic-audit", icon: Search },
      { title: "Migration Reports", url: "/admin/bsk-migration-reports", icon: FileBarChart },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: FileText },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { title: "Settings", url: "/admin/settings", icon: Settings },
      { title: "Mobile Linking", url: "/admin/mobile-linking", icon: Smartphone },
      { title: "Database Cleanup", url: "/admin/database-cleanup", icon: Trash2 },
      { title: "Database Reset", url: "/admin/database-reset", icon: AlertTriangle },
    ],
  },
];

export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);

export function isAdminItemActive(pathname: string, url: string): boolean {
  if (url === "/admin") return pathname === "/admin" || pathname === "/admin/dashboard";
  if (pathname === url) return true;
  // Only match prefixes when no longer sibling item matches exactly (prevents /admin/users matching /admin/users/financial)
  const longer = allAdminNavItems.some((i) => i.url !== url && i.url.startsWith(url + "/") && pathname.startsWith(i.url));
  return !longer && pathname.startsWith(url + "/");
}

/** Resolve the human title for the current route (used by the header). */
export function getAdminPageTitle(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/dashboard") return "Dashboard";
  const exact = allAdminNavItems.find((i) => i.url === pathname);
  if (exact) return exact.title;
  const prefix = allAdminNavItems
    .filter((i) => i.url !== "/admin" && pathname.startsWith(i.url + "/"))
    .sort((a, b) => b.url.length - a.url.length)[0];
  if (prefix) return prefix.title;
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return last.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function getAdminGroupForPath(pathname: string): AdminNavGroup | undefined {
  return adminNavGroups.find((g) => g.items.some((i) => isAdminItemActive(pathname, i.url)));
}
