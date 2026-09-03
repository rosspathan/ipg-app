import { Outlet } from "react-router-dom";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { AdminHeaderUnified } from "@/components/admin/unified/AdminHeaderUnified";
import { AdminSidebarUnified, ADMIN_SIDEBAR_WIDTH } from "@/components/admin/unified/AdminSidebarUnified";
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
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  useTransferNotifications();

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen w-full bg-[hsl(240_35%_7%)] text-foreground">
          {/* Desktop sidebar — fixed to the left edge, full viewport height */}
          <div
            className="hidden lg:block fixed inset-y-0 left-0 z-50"
            style={{ width: ADMIN_SIDEBAR_WIDTH }}
          >
            <AdminSidebarUnified className="h-screen" />
          </div>

          {/* Mobile drawer */}
          <MobileDrawerSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

          {/* Main column, offset by the sidebar width on desktop */}
          <div
            className="flex flex-col min-h-screen min-w-0 lg:pl-[var(--admin-sidebar-w)]"
            style={{ ["--admin-sidebar-w" as string]: `${ADMIN_SIDEBAR_WIDTH}px` }}
          >
            <AdminHeaderUnified
              onCommandOpen={() => setCommandOpen(true)}
              onMobileMenuOpen={() => setMobileMenuOpen(true)}
            />

            <main className="flex-1 min-w-0">
              <div
                className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6"
                style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
              >
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
