import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  FileText,
  Shield,
  Activity,
  Database,
  Bell,
  MessageSquare,
  Megaphone,
  Image,
  Zap,
  Award,
  CreditCard,
  BarChart3,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Wallet,
  Coins,
  PiggyBank,
  Gift,
  Target,
  Trash2,
  Send,
  ArrowRightLeft,
  ArrowDownCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    children: [
      { title: "All Users", url: "/admin/users", icon: Users },
      { title: "KYC Review", url: "/admin/kyc-review", icon: Shield },
      { title: "Role Management", url: "/admin/role-management", icon: UserPlus },
      { title: "Badge System", url: "/admin/badge-system", icon: Award },
    ],
  },
  {
    title: "Financial Hub",
    url: "/admin/financial",
    icon: DollarSign,
    children: [
      { title: "BSK Management", url: "/admin/bsk-management", icon: Coins },
      { title: "Send BSK", url: "/admin/bsk-send", icon: Send },
      { title: "Transfer History", url: "/admin/bsk-transfer-history", icon: ArrowRightLeft },
      { title: "BSK Withdrawals", url: "/admin/bsk-withdrawals", icon: ArrowDownCircle },
      { title: "Crypto Withdrawals", url: "/admin/crypto-withdrawals", icon: Wallet },
      { title: "Deposits", url: "/admin/funding", icon: DollarSign },
      { title: "INR Funding", url: "/admin/inr-funding", icon: CreditCard },
      { title: "BSK Loans", url: "/admin/bsk-loans", icon: PiggyBank },
      { title: "Manual Purchases", url: "/admin/manual-purchases", icon: ShoppingCart },
      { title: "Crypto Conversions", url: "/admin/crypto-conversions", icon: Zap },
      { title: "Financial Reports", url: "/admin/financial-reports", icon: BarChart3 },
      { title: "Financial Analytics", url: "/admin/financial-analytics", icon: TrendingUp },
    ],
  },
  {
    title: "Trading",
    url: "/admin/trading",
    icon: TrendingUp,
    children: [
      { title: "Markets", url: "/admin/markets", icon: TrendingUp },
      { title: "Market Feed", url: "/admin/market-feed", icon: Activity },
      { title: "Orders", url: "/admin/trading-orders", icon: FileText },
      { title: "Trading Engine", url: "/admin/trading-engine", icon: Zap },
      { title: "Trading Fees", url: "/admin/fees-simple", icon: DollarSign },
    ],
  },
  {
    title: "Programs",
    url: "/admin/programs",
    icon: FolderKanban,
    children: [
      { title: "Economics Dashboard", url: "/admin/programs/economics", icon: DollarSign },
      { title: "All Programs", url: "/admin/programs", icon: FolderKanban },
      { title: "Control Center", url: "/admin/programs/control-center", icon: Target },
      { title: "Program Editor", url: "/admin/programs/editor/new", icon: FileText },
      { title: "Analytics", url: "/admin/programs/analytics", icon: BarChart3 },
      { title: "Templates", url: "/admin/programs/templates", icon: FileText },
    ],
  },
  {
    title: "Program Controls",
    url: "/admin/program-controls",
    icon: Zap,
    children: [
      { title: "Ad Mining", url: "/admin/programs/ad-mining", icon: Megaphone },
      { title: "Lucky Draw", url: "/admin/programs/lucky-draw", icon: Gift },
      { title: "Spin Wheel", url: "/admin/programs/spin-wheel", icon: Target },
      { title: "Staking", url: "/admin/staking", icon: Coins },
      { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
      { title: "Insurance", url: "/admin/insurance", icon: Shield },
      { title: "Purchase Bonus", url: "/admin/purchase-bonus", icon: Gift },
    ],
  },
  {
    title: "Referrals",
    url: "/admin/referrals",
    icon: UserPlus,
    children: [
      { title: "Referral Program", url: "/admin/referrals", icon: UserPlus },
      { title: "Team Referrals", url: "/admin/team-referrals", icon: Users },
      { title: "50 Level System", url: "/admin/50-level-referrals", icon: Award },
      { title: "Badge Qualification", url: "/admin/badge-qualification", icon: Award },
      { title: "Manual Assignment", url: "/admin/manual-referral-assignment", icon: UserPlus },
      { title: "Commission History", url: "/admin/commission-history", icon: Coins },
      { title: "Retroactive Rewards", url: "/admin/retroactive-rewards", icon: Zap },
    ],
  },
  {
    title: "Content",
    url: "/admin/content",
    icon: FileText,
    children: [
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
      { title: "Carousel", url: "/admin/carousel", icon: Image },
      { title: "Ads Manager", url: "/admin/ads", icon: Megaphone },
    ],
  },
  {
    title: "Support",
    url: "/admin/support",
    icon: MessageSquare,
    children: [
      { title: "Support Tickets", url: "/admin/support", icon: MessageSquare },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
    ],
  },
  {
    title: "System",
    url: "/admin/system",
    icon: Activity,
    children: [
      { title: "System Health", url: "/admin/system-health", icon: Activity },
      { title: "Database Reset", url: "/admin/database-reset", icon: Database },
      { title: "Database Cleanup", url: "/admin/database-cleanup", icon: Trash2 },
      { title: "Currencies", url: "/admin/currency-control", icon: DollarSign },
      { title: "Transactions", url: "/admin/transaction-control", icon: TrendingUp },
      { title: "Assets", url: "/admin/assets", icon: Coins },
    ],
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    children: [
      { title: "General Settings", url: "/admin/settings", icon: Settings },
      { title: "KYC Settings", url: "/admin/kyc-settings", icon: Shield },
      { title: "System Config", url: "/admin/system-config", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openGroups, setOpenGroups] = useState<string[]>(["User Management", "Financial Hub", "Programs"]);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.url)) return true;
    return item.children?.some((child) => isActive(child.url)) ?? false;
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  return (
    <Sidebar
      className={cn(
        "border-r border-[hsl(220_13%_14%/0.4)] bg-[hsl(220_13%_7%)] transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[260px]"
      )}
      collapsible="icon"
    >
      <SidebarContent className="py-2">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="px-4 text-[hsl(220_9%_65%)] text-xs font-semibold uppercase tracking-wider mb-2">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const parentActive = isParentActive(item);
                const isOpen = openGroups.includes(item.title);

                if (!hasChildren) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            isActive(item.url)
                              ? "bg-[hsl(262_100%_65%/0.1)] text-[hsl(262_100%_65%)]"
                              : "text-[hsl(220_9%_65%)] hover:bg-[hsl(220_13%_12%)] hover:text-[hsl(0_0%_98%)]"
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    open={!isCollapsed && isOpen}
                    onOpenChange={() => toggleGroup(item.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
                            parentActive
                              ? "bg-[hsl(262_100%_65%/0.1)] text-[hsl(262_100%_65%)]"
                              : "text-[hsl(220_9%_65%)] hover:bg-[hsl(220_13%_12%)] hover:text-[hsl(0_0%_98%)]"
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {!isCollapsed && (
                            <>
                              <span className="text-sm font-medium flex-1 text-left">{item.title}</span>
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 shrink-0" />
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!isCollapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children?.map((child) => (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                                  <NavLink
                                    to={child.url}
                                    className={cn(
                                      "flex items-center gap-3 pl-11 pr-3 py-2 rounded-lg transition-all duration-200",
                                      isActive(child.url)
                                        ? "bg-[hsl(262_100%_65%/0.15)] text-[hsl(262_100%_65%)] font-medium"
                                        : "text-[hsl(220_9%_65%)] hover:bg-[hsl(220_13%_12%)] hover:text-[hsl(0_0%_98%)]"
                                    )}
                                  >
                                    <child.icon className="w-4 h-4 shrink-0" />
                                    <span className="text-sm">{child.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
