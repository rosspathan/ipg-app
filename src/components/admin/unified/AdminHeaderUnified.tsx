import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useEffect } from "react";
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";

interface AdminHeaderUnifiedProps {
  onCommandOpen: () => void;
  onMobileMenuOpen?: () => void;
}

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

export function AdminHeaderUnified({ onCommandOpen, onMobileMenuOpen }: AdminHeaderUnifiedProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandOpen]);

  return (
    <header
      className="sticky top-0 z-40 bg-[hsl(235_28%_13%)] border-b border-[hsl(235_20%_22%/0.12)] backdrop-blur-xl"
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 gap-3">
        {/* Left: Hamburger (mobile) + Sidebar Trigger (desktop) + Logo/Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile: Hamburger menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuOpen}
            className="lg:hidden h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_18%)] shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop: Sidebar trigger */}
          <div className="hidden lg:block">
            <SidebarTrigger />
          </div>
          
          {/* Mobile: Logo */}
          <div className="lg:hidden flex items-center">
            <BrandLogoBlink className="shrink-0" />
          </div>

          {/* Breadcrumbs - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3 min-w-0">
            <div className="h-6 w-px bg-[hsl(235_20%_22%/0.12)]" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={crumb.path}>
                    {index < breadcrumbs.length - 1 ? (
                      <>
                        <BreadcrumbLink
                          href={crumb.path}
                          className="text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] transition-colors text-sm"
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator className="text-[hsl(235_20%_22%)]" />
                      </>
                    ) : (
                      <BreadcrumbPage className="text-[hsl(0_0%_98%)] font-semibold text-sm">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search / Command Palette */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandOpen}
            className="h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)]"
            title="Search (⌘K)"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications - Real-time */}
          <AdminNotificationCenter />

          {/* Profile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/profile")}
            className="h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)]"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
