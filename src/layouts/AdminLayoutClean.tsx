import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/unified/AdminSidebar";
import { ViewAsUserButton } from "@/components/admin/clean/ViewAsUserButton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

// Helper to generate breadcrumbs from path
const getBreadcrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    breadcrumbs.push({
      label: index === 0 ? "Admin" : label,
      path: currentPath,
    });
  });

  return breadcrumbs;
};

const AdminLayoutClean = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-[hsl(220_13%_4%)] overflow-hidden">
          {/* Collapsible Sidebar */}
          <AdminSidebar />

          <div className="flex flex-col h-screen flex-1 overflow-hidden">
            {/* Clean Header */}
            <header
              className="sticky top-0 z-40 bg-[hsl(220_13%_7%)] border-b border-[hsl(220_13%_14%/0.4)]"
              style={{
                paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
              }}
            >
              <div className="flex items-center justify-between h-14 px-4 gap-3 w-full">
                {/* Left: Sidebar trigger + Breadcrumbs */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <SidebarTrigger className="shrink-0 text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]" />
                  <div className="h-6 w-px bg-[hsl(220_13%_14%/0.4)]" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      {breadcrumbs.map((crumb, index) => (
                        <BreadcrumbItem key={crumb.path}>
                          {index < breadcrumbs.length - 1 ? (
                            <>
                              <BreadcrumbLink
                                href={crumb.path}
                                className="text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
                              >
                                {crumb.label}
                              </BreadcrumbLink>
                              <BreadcrumbSeparator className="text-[hsl(220_13%_14%)]" />
                            </>
                          ) : (
                            <BreadcrumbPage className="text-[hsl(0_0%_98%)] font-semibold">
                              {crumb.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
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
            <main className="flex-1 w-full px-6 py-6 overflow-y-auto">
              <div className="max-w-screen-2xl mx-auto">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayoutClean;
