import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import { Search, User, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
      className="z-40 h-16 shrink-0 border-b border-[hsl(235_20%_22%/0.25)] bg-[hsl(235_28%_11%/0.92)] backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-full min-w-0 items-center justify-between gap-2 px-4 lg:px-8">
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

          <div className="hidden shrink-0 sm:flex lg:hidden">
            <BrandLogoBlink />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
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
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label="Open admin account menu">
                <Avatar className="h-8 w-8 border border-[hsl(262_100%_65%/0.45)]">
                  <AvatarFallback className="bg-[hsl(262_100%_65%/0.14)] text-[hsl(262_100%_78%)]">A</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/admin/profile")} className="min-h-10 gap-2">
                <User className="h-4 w-4" />
                Admin profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings")} className="min-h-10 gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
