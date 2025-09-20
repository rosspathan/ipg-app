import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Coins,
  LineChart,
  Banknote,
  BadgePercent,
  Share2,
  Layers,
  Pointer,
  Gift,
  ShieldCheck,
  Megaphone,
  ReceiptText,
  ArrowLeftRight,
  ShieldAlert,
  BarChart3,
  Settings,
} from "lucide-react";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Assets", url: "/admin/assets", icon: Coins },
  { title: "Markets", url: "/admin/markets", icon: LineChart },
  { title: "Funding", url: "/admin/funding", icon: Banknote },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: BadgePercent },
  { title: "Referrals", url: "/admin/referrals", icon: Share2 },
  { title: "Staking", url: "/admin/staking", icon: Layers },
  { title: "Spin Wheel", url: "/admin/lucky", icon: Pointer },
  { title: "Lucky Draw", url: "/admin/lucky/draw", icon: Gift },
  { title: "Insurance", url: "/admin/insurance", icon: ShieldCheck },
  { title: "Ads", url: "/admin/ads", icon: Megaphone },
  { title: "Fees", url: "/admin/fees", icon: ReceiptText },
  { title: "Transfers", url: "/admin/transfers", icon: ArrowLeftRight },
  { title: "Compliance", url: "/admin/compliance", icon: ShieldAlert },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "System", url: "/admin/system", icon: Settings },
];

export function AppAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isActive = (path: string) =>
    path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="offcanvas" className="bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isActive(item.url)}
                    onClick={() => navigate(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
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

export default AppAdminSidebar;
