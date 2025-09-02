import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Badge } from "@/components/ui/badge";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
    { path: "/admin/lucky", label: "Lucky Draw" },
    { path: "/admin/insurance", label: "Insurance" },
    { path: "/admin/ads", label: "Ads" },
    { path: "/admin/fees", label: "Fees" },
    { path: "/admin/transfers", label: "Transfers" },
    { path: "/admin/compliance", label: "Compliance" },
    { path: "/admin/reports", label: "Reports" },
    { path: "/admin/system", label: "System" },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/admin/login");
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              I-SMART Admin
            </h1>
            <Badge variant="outline">Admin Console</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/")}
            >
              Switch to User App
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6">
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className="whitespace-nowrap"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;