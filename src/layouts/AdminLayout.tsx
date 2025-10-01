import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/nova/AdminSidebar";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/admin/nova/BreadcrumbNav";
import { DockAdmin } from "@/components/admin/nova/DockAdmin";

const AdminLayout = () => {
  return (
    <NavigationStateManager>
      <SidebarProvider>
        <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]">
          {/* Desktop Sidebar - hidden on mobile */}
          <div className="hidden md:block">
            <AdminSidebar />
          </div>

          {/* Main Content */}
          <div className="flex flex-col min-h-screen">
            {/* Top Header - Mobile Optimized */}
            <header className="sticky top-0 z-40 bg-[hsl(230_28%_13%/0.95)] backdrop-blur-xl border-b border-[hsl(225_24%_22%/0.16)] shadow-[0_8px_32px_-8px_hsl(245_35%_7%/0.4)] pt-[env(safe-area-inset-top)]">
              <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-4 gap-2 md:gap-3">
                {/* Left: Trigger + Logo */}
                <div className="flex items-center gap-2 md:gap-3">
                  <SidebarTrigger className="text-muted-foreground hover:text-foreground touch-manipulation w-10 h-10 md:w-auto md:h-auto" />
                  <div className="hidden md:block">
                    <BrandLogoBlink />
                  </div>
                </div>

                {/* Center: Title (mobile only) */}
                <h1 className="flex-1 text-base md:text-lg font-heading font-bold text-foreground truncate md:hidden">
                  Admin
                </h1>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 md:w-9 md:h-9 text-muted-foreground hover:text-foreground touch-manipulation"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 md:w-9 md:h-9 text-muted-foreground hover:text-foreground relative touch-manipulation"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Breadcrumb */}
            <BreadcrumbNav />

            {/* Page Content - Mobile Optimized */}
            <main className="flex-1 pb-24 md:pb-8">
              <Outlet />
            </main>

            {/* Mobile Dock - visible only on mobile */}
            <div className="md:hidden">
              <DockAdmin />
            </div>
          </div>
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayout;