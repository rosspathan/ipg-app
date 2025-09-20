import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppAdminSidebar } from "@/components/admin/AppAdminSidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthAdmin();

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/assets", label: "Assets" },
    { path: "/admin/markets", label: "Markets" },
    { path: "/admin/funding", label: "Funding" },
    { path: "/admin/subscriptions", label: "Subscriptions" },
    { path: "/admin/referrals", label: "Referrals" },
    { path: "/admin/staking", label: "Staking" },
    { path: "/admin/lucky", label: "Spin Wheel" },
    { path: "/admin/lucky/draw", label: "Lucky Draw" },
    { path: "/admin/insurance", label: "Insurance" },
    { path: "/admin/ads", label: "Ads" },
    { path: "/admin/fees", label: "Fees" },
    { path: "/admin/transfers", label: "Transfers" },
    { path: "/admin/compliance", label: "Compliance" },
    { path: "/admin/reports", label: "Reports" },
    { path: "/admin/system", label: "System" },
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
    <SidebarProvider>
      {/* Top Header */}
      <div className="sticky top-0 z-40 border-b bg-card">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
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
        {/* Mobile nav */}
        <div className="md:hidden px-3 pb-2">
          <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className="whitespace-nowrap text-xs px-2 min-w-fit"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <AppAdminSidebar />
        </div>
        <main className="flex-1">
          <div className="container mx-auto px-3 md:px-6 py-4 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
