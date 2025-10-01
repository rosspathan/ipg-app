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
        <div className="flex min-h-screen w-full bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]">
          {/* Desktop Sidebar - Only visible on desktop (lg+) */}
          <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-50">
            <AdminSidebar />
          </div>

          {/* Main Content Wrapper - Full width on mobile, offset on desktop */}
          <div className="flex flex-col min-h-screen w-full lg:pl-64">
            {/* Top Header - Mobile Optimized with Safe Areas */}
            <header 
              className="sticky top-0 z-40 bg-[hsl(230_28%_13%/0.95)] backdrop-blur-xl border-b border-[hsl(225_24%_22%/0.16)] shadow-[0_4px_24px_-8px_hsl(245_35%_7%/0.5)]"
              style={{
                paddingTop: 'max(env(safe-area-inset-top), 0.5rem)'
              }}
            >
              <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 px-2 sm:px-3 md:px-4 gap-2">
                {/* Left: Trigger (only on desktop) + Logo */}
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
                  <SidebarTrigger className="hidden lg:flex text-muted-foreground hover:text-foreground touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center shrink-0" />
                  <div className="shrink-0">
                    <BrandLogoBlink />
                  </div>
                </div>

                {/* Center: Title (mobile) */}
                <h1 className="flex-1 text-sm sm:text-base md:text-lg font-heading font-bold text-foreground truncate lg:hidden px-2">
                  Admin
                </h1>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground touch-manipulation"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground relative touch-manipulation"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-[hsl(230_28%_13%)]" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Breadcrumb - Hidden on small mobile */}
            <div className="hidden sm:block lg:block">
              <BreadcrumbNav />
            </div>

            {/* Page Content - Mobile Optimized with Safe Areas */}
            <main 
              className="flex-1 overflow-x-hidden overflow-y-auto"
              style={{
                paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
                paddingLeft: 'max(env(safe-area-inset-left), 0px)',
                paddingRight: 'max(env(safe-area-inset-right), 0px)',
              }}
            >
              <Outlet />
            </main>

            {/* Mobile Dock - Only visible on mobile (< lg) */}
            <div className="lg:hidden">
              <DockAdmin />
            </div>
          </div>
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayout;