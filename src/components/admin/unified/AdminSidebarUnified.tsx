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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Programs", url: "/admin/programs", icon: FolderKanban },
  { title: "Markets", url: "/admin/markets", icon: TrendingUp },
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
  { title: "Announcements", url: "/admin/announcements", icon: Bell },
  { title: "System Health", url: "/admin/system-health", icon: Database },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: FileText },
  { title: "Orphaned Users", url: "/admin/orphaned-users-cleanup", icon: AlertTriangle },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebarUnified() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return active
      ? "bg-[hsl(262_100%_65%/0.12)] text-[hsl(262_100%_65%)] font-semibold"
      : "text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)]";
  };

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="bg-[hsl(235_28%_13%)] border-r border-[hsl(235_20%_22%/0.12)]">
        {/* Logo Section - Only show when expanded */}
        {!collapsed && (
          <div className="p-4 border-b border-[hsl(235_20%_22%/0.12)]">
            <BrandLogoBlink />
            <p className="text-xs text-[hsl(240_10%_70%)] mt-1">Admin Console</p>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[hsl(240_10%_50%)] uppercase text-xs font-semibold px-3 py-2">
              Main
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto bg-[hsl(0_70%_68%)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Section */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[hsl(240_10%_50%)] uppercase text-xs font-semibold px-3 py-2">
              Management
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto bg-[hsl(0_70%_68%)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[hsl(240_10%_50%)] uppercase text-xs font-semibold px-3 py-2">
              System
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
