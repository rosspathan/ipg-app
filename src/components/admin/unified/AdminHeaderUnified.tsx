import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getAdminGroupForPath, getAdminPageTitle } from "./adminNav";

interface AdminHeaderUnifiedProps {
  onCommandOpen: () => void;
  onMobileMenuOpen?: () => void;
}

export function AdminHeaderUnified({ onCommandOpen, onMobileMenuOpen }: AdminHeaderUnifiedProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const title = getAdminPageTitle(location.pathname);
  const group = getAdminGroupForPath(location.pathname);
  const isHome = location.pathname === "/admin" || location.pathname === "/admin/dashboard";

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
      className="sticky top-0 z-40 bg-[hsl(235_28%_11%/0.92)] border-b border-[hsl(235_20%_22%/0.25)] backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between min-h-16 px-4 lg:px-8 py-2 gap-3">
        {/* Left: hamburger (mobile) + title + breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuOpen}
            className="lg:hidden h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_18%)] shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="lg:hidden flex items-center shrink-0">
            <BrandLogoBlink />
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList className="text-xs sm:text-xs gap-1">
                <BreadcrumbItem>
                  {isHome ? (
                    <BreadcrumbPage className="text-[hsl(240_10%_60%)] text-xs">Admin</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="/admin"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/admin");
                      }}
                      className="text-[hsl(240_10%_60%)] hover:text-[hsl(0_0%_98%)] transition-colors text-xs"
                    >
                      Admin
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {group && !isHome && (
                  <>
                    <BreadcrumbSeparator className="text-[hsl(235_20%_30%)]" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[hsl(240_10%_60%)] text-xs">{group.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
                {!isHome && (
                  <>
                    <BreadcrumbSeparator className="text-[hsl(235_20%_30%)]" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[hsl(262_100%_78%)] font-medium text-xs">{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-base lg:text-lg font-bold text-[hsl(0_0%_98%)] leading-tight truncate">{title}</h1>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandOpen}
            className="h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)]"
            title="Search (⌘K)"
            aria-label="Open command palette"
          >
            <Search className="h-5 w-5" />
          </Button>
          <AdminNotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/profile")}
            className="h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)]"
            aria-label="Admin profile"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
