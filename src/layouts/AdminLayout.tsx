import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppAdminSidebar } from "@/components/admin/AppAdminSidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthAdmin();

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
            <SidebarTrigger className="mr-1" />
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
      </div>

      {/* Layout */}
      <div className="flex min-h-screen w-full">
        <AppAdminSidebar />
        <SidebarInset>
          <div className="container mx-auto px-3 md:px-6 py-4 md:py-8">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
