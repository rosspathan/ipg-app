import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Badge } from "@/components/ui/badge";
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
import MobileAdminMenu from "@/components/admin/MobileAdminMenu";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthAdmin();

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/assets", label: "Assets", icon: Coins },
    { path: "/admin/markets", label: "Markets", icon: LineChart },
    { path: "/admin/funding", label: "Funding", icon: Banknote },
    { path: "/admin/subscriptions", label: "Subscriptions", icon: BadgePercent },
    { path: "/admin/referrals", label: "Referrals", icon: Share2 },
    { path: "/admin/staking", label: "Staking", icon: Layers },
    { path: "/admin/lucky", label: "Spin Wheel", icon: Pointer },
    { path: "/admin/lucky/draw", label: "Lucky Draw", icon: Gift },
    { path: "/admin/insurance", label: "Insurance", icon: ShieldCheck },
    { path: "/admin/ads", label: "Ads", icon: Megaphone },
    { path: "/admin/fees", label: "Fees", icon: ReceiptText },
    { path: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
    { path: "/admin/compliance", label: "Compliance", icon: ShieldAlert },
    { path: "/admin/reports", label: "Reports", icon: BarChart3 },
    { path: "/admin/system", label: "System", icon: Settings },
  ];

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/admin/login");
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <div className="sticky top-0 z-40 border-b bg-card">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <MobileAdminMenu className="md:hidden" />
            <h1 className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              I-SMART Admin
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex">Admin Console</Badge>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="text-xs md:text-sm px-2 md:px-3"
            >
              <span className="hidden sm:inline">User App</span>
              <span className="sm:hidden">User</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs md:text-sm px-2 md:px-3"
            >
              Sign Out
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation removed in favor of drawer menu */}
      </div>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-16 md:border-r md:bg-card">
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  onClick={() => navigate(item.path)}
                  className="w-full justify-start text-sm px-3 py-2 h-auto"
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 md:ml-64">
          <div className="mx-auto w-full max-w-full md:max-w-screen-xl px-4 md:px-6 py-2 md:py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;