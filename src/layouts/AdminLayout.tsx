import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/admin/nova/BreadcrumbNav";
import { DockAdmin } from "@/components/admin/nova/DockAdmin";

const AdminLayout = () => {
  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full bg-gradient-to-b from-[hsl(245_35%_7%)] to-[hsl(234_38%_13%)]">
          {/* Main Content Wrapper - Full width, mobile-first */}
          <div className="flex flex-col min-h-screen w-full">
            {/* Top Header - Mobile Optimized with Safe Areas */}
            <header 
              className="sticky top-0 z-40 bg-[hsl(230_28%_13%/0.95)] backdrop-blur-xl border-b border-[hsl(225_24%_22%/0.16)] shadow-[0_4px_24px_-8px_hsl(245_35%_7%/0.5)]"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)'
              }}
            >
              <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2 w-full">
                {/* Left: Logo */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">
                    <BrandLogoBlink />
                  </div>
                </div>

                {/* Center: Title */}
                <h1 className="flex-1 text-base sm:text-lg font-heading font-bold text-foreground truncate text-center">
                  Admin Console
                </h1>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground relative"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-[hsl(230_28%_13%)]" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Breadcrumb Navigation */}
            <BreadcrumbNav />

            {/* Page Content - Mobile Optimized with proper spacing for fixed dock */}
            <main 
              className="flex-1 w-full px-3 sm:px-4 py-4"
              style={{
                paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
                minHeight: 'calc(100vh - 14rem)'
              }}
            >
              <Outlet />
            </main>

            {/* Mobile Dock - Fixed at bottom */}
            <DockAdmin />
          </div>
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayout;
