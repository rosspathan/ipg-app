import { Outlet } from "react-router-dom";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { AdminHeaderUnified } from "@/components/admin/unified/AdminHeaderUnified";
import { AdminSidebarUnified } from "@/components/admin/unified/AdminSidebarUnified";
import { AdminDockUnified } from "@/components/admin/unified/AdminDockUnified";
import { MobileDrawerSidebar } from "@/components/admin/unified/MobileDrawerSidebar";
import { CommandPalette } from "@/components/admin/unified/CommandPalette";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useTransferNotifications } from "@/hooks/useTransferNotifications";
import { useTheme } from "next-themes";

/**
 * Unified Admin Layout - World-Class Admin Panel
 * Features:
 * - Responsive sidebar (desktop) + bottom dock (mobile)
 * - Command palette (⌘K)
 * - Consistent spacing and design
 * - Safe area support
 */
const AdminLayoutUnified = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setTheme } = useTheme();
  
  // Force dark mode in admin panel
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);
  
  // Enable real-time notifications for large transfers
  useTransferNotifications();

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-[hsl(240_35%_7%)] text-foreground">
          {/* Desktop Sidebar - Hidden on mobile/tablet */}
          <div className="hidden lg:block">
            <AdminSidebarUnified />
          </div>

          {/* Mobile Drawer Sidebar - slides in on lg:hidden */}
          <MobileDrawerSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header - Always visible */}
            <AdminHeaderUnified
              onCommandOpen={() => setCommandOpen(true)}
              onMobileMenuOpen={() => setMobileMenuOpen(true)}
            />

            {/* Page Content - Scrollable */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <div
                className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6"
                style={{
                  paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))",
                }}
              >
                <Outlet />
              </div>
            </main>
          </div>

          {/* Mobile Bottom Dock - Hidden on desktop, fixed position */}
          <div className="lg:hidden">
            <AdminDockUnified onCommandOpen={() => setCommandOpen(true)} />
          </div>

          {/* Command Palette - Global keyboard shortcut */}
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayoutUnified;
