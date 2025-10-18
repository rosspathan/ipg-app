import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Repeat,
  Coins,
  Sparkles,
  Layers,
  TrendingUp,
  Settings,
  Package,
  FileText,
  ChevronRight,
  Award,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ForwardRefExoticComponent<any>;
  children?: Array<{ title: string; url: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Markets",
    url: "/admin/markets",
    icon: Repeat,
  },
  {
    title: "BSK Management",
    url: "/admin/bsk",
    icon: Coins,
  },
  {
    title: "Programs",
    url: "/admin/programs",
    icon: Package,
    children: [
      { title: "All Programs", url: "/admin/programs" },
      { title: "Control Center", url: "/admin/programs/control-center" },
      { title: "Templates", url: "/admin/programs/templates" },
      { title: "Analytics", url: "/admin/programs/analytics" },
    ],
  },
  {
    title: "Spin Wheel",
    url: "/admin/spin",
    icon: Sparkles,
  },
  {
    title: "Staking",
    url: "/admin/staking",
    icon: Layers,
  },
  {
    title: "Badge Qualification",
    url: "/admin/badge-qualification",
    icon: Award,
  },
  {
    title: "Subscriptions",
    url: "/admin/subscriptions",
    icon: TrendingUp,
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (url: string) => location.pathname === url;
  const hasActiveChild = (children?: Array<{ title: string; url: string }>) =>
    children?.some((child) => isActive(child.url)) || false;

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 border-r border-border/50",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>
            Admin Console
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.url) || hasActiveChild(item.children);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                          "hover:bg-primary/10 hover:text-primary",
                          active && "bg-primary/20 text-primary font-semibold"
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 text-sm">{item.title}</span>
                        )}
                        {!collapsed && item.children && (
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 transition-transform",
                              hasActiveChild(item.children) && "rotate-90"
                            )}
                          />
                        )}
                      </NavLink>
                    </SidebarMenuButton>

                    {/* Children items */}
                    {!collapsed && item.children && hasActiveChild(item.children) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.url}
                            to={child.url}
                            className={cn(
                              "block px-3 py-1.5 rounded-md text-sm transition-colors",
                              "hover:bg-primary/10 hover:text-primary",
                              isActive(child.url) &&
                                "bg-primary/20 text-primary font-medium"
                            )}
                          >
                            {child.title}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
