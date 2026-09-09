import { Outlet } from "react-router-dom";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { AdminHeaderUnified } from "@/components/admin/unified/AdminHeaderUnified";
import { AdminSidebarUnified } from "@/components/admin/unified/AdminSidebarUnified";
import { MobileDrawerSidebar } from "@/components/admin/unified/MobileDrawerSidebar";
import { CommandPalette } from "@/components/admin/unified/CommandPalette";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useTransferNotifications } from "@/hooks/useTransferNotifications";
import { useTheme } from "next-themes";

/**
 * Unified Admin Layout
 * - Desktop: sidebar fixed to the left edge (260px, full height)
 * - Main content on the right with page title + breadcrumbs header
 * - Mobile/tablet: slide-in drawer with the same sidebar
 * - Command palette (⌘K)
 */
const AdminLayoutUnified = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  useEffect(() => {
    try {
      localStorage.setItem("admin-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* ignore storage failures */
    }
  }, [sidebarCollapsed]);

  useTransferNotifications();

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-[hsl(240_35%_7%)] text-foreground">
          <AdminSidebarUnified
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            className={sidebarCollapsed ? "hidden h-full w-[72px] shrink-0 lg:flex" : "hidden h-full w-[264px] shrink-0 lg:flex"}
          />

          <MobileDrawerSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeaderUnified
              onCommandOpen={() => setCommandOpen(true)}
              onMobileMenuOpen={() => setMobileMenuOpen(true)}
            />

            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">
                <Outlet />
              </div>
            </main>
          </div>

          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayoutUnified;
