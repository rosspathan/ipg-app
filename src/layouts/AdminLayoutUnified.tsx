import { Outlet } from "react-router-dom";
import { NavigationStateManager } from "@/components/navigation/NavigationGuards";
import { AdminHeaderUnified } from "@/components/admin/unified/AdminHeaderUnified";
import { AdminSidebarUnified } from "@/components/admin/unified/AdminSidebarUnified";
import { AdminDockUnified } from "@/components/admin/unified/AdminDockUnified";
import { CommandPalette } from "@/components/admin/unified/CommandPalette";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState } from "react";
import { useTransferNotifications } from "@/hooks/useTransferNotifications";

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
  
  // Enable real-time notifications for large transfers
  useTransferNotifications();

  return (
    <NavigationStateManager>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-[hsl(240_35%_7%)]">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <AdminSidebarUnified />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header - Always visible */}
            <AdminHeaderUnified onCommandOpen={() => setCommandOpen(true)} />

            {/* Page Content - Scrollable */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
                <Outlet />
              </div>
            </main>

            {/* Mobile Bottom Dock - Hidden on desktop */}
            <div className="md:hidden">
              <AdminDockUnified onCommandOpen={() => setCommandOpen(true)} />
            </div>
          </div>

          {/* Command Palette - Global keyboard shortcut */}
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </div>
      </SidebarProvider>
    </NavigationStateManager>
  );
};

export default AdminLayoutUnified;
