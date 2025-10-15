import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDockClean } from "@/components/admin/clean/AdminDockClean";
import { ViewAsUserButton } from "@/components/admin/clean/ViewAsUserButton";

// Page title mapping
const pageTitles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "User Management",
  "/admin/programs": "Programs",
  "/admin/programs/control-center": "Program Control",
  "/admin/settings": "Settings",
};

const AdminLayoutClean = () => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "Admin Console";

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen w-full bg-[hsl(220_13%_4%)] overflow-hidden">
          <div className="flex flex-col h-screen w-full overflow-hidden">
            {/* Clean Header */}
            <header 
              className="sticky top-0 z-40 bg-[hsl(220_13%_7%)] border-b border-[hsl(220_13%_14%/0.4)]"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)'
              }}
            >
              <div className="flex items-center justify-between h-14 px-4 gap-3 w-full max-w-screen-xl mx-auto">
                {/* Left: Logo */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    <BrandLogoBlink />
                  </div>
                  <div className="h-6 w-px bg-[hsl(220_13%_14%/0.4)]" />
                  <h1 className="text-lg font-bold text-[hsl(0_0%_98%)] truncate">
                    {currentTitle}
                  </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:block">
                    <ViewAsUserButton />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_12%)]"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_12%)] relative"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[hsl(0_84%_60%)] rounded-full ring-2 ring-[hsl(220_13%_7%)]" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main 
              className="flex-1 w-full px-4 py-6 max-w-screen-xl mx-auto overflow-y-auto"
              style={{
                paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
              }}
            >
              <Outlet />
            </main>

            {/* Clean Bottom Dock */}
            <AdminDockClean />
          </div>
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayoutClean;
