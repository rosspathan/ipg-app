import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogoBlink } from "@/components/admin/nova/BrandLogoBlink";
import {
  adminNavGroups,
  isAdminItemActive,
  getAdminGroupForPath,
  type AdminNavGroup,
  type AdminNavItem,
} from "./adminNav";

const STORAGE_KEY = "admin-sidebar-open-groups";

function loadOpenGroups(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface NavGroupProps {
  group: AdminNavGroup;
  items: AdminNavItem[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate: (url: string) => void;
  collapsed: boolean;
}

function NavGroup({ group, items, open, onToggle, pathname, onNavigate, collapsed }: NavGroupProps) {
  const GroupIcon = group.icon;
  const hasActive = items.some((i) => isAdminItemActive(pathname, i.url));

  return (
    <div className="mb-1 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex min-h-10 w-full min-w-0 items-center rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
          hasActive
            ? "text-[hsl(262_100%_75%)]"
            : "text-[hsl(240_10%_50%)] hover:text-[hsl(240_10%_75%)] hover:bg-[hsl(235_28%_15%)]"
        )}
        title={collapsed ? `${group.label} (${items.length})` : undefined}
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 text-left">{group.label}</span>}
        {!collapsed && <span className="text-[10px] font-medium text-[hsl(240_10%_40%)] tabular-nums">{items.length}</span>}
        {!collapsed && <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />}
      </button>

      {!collapsed && open && (
        <div className="mt-0.5 space-y-0.5 pl-2 border-l border-[hsl(235_20%_22%/0.35)] ml-4">
          {items.map((item) => {
            const active = isAdminItemActive(pathname, item.url);
            return (
              <button
                key={item.url}
                type="button"
                onClick={() => onNavigate(item.url)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all duration-150",
                  active
                    ? "bg-[hsl(262_100%_65%/0.14)] text-[hsl(262_100%_78%)] font-semibold shadow-[inset_2px_0_0_hsl(262_100%_65%)]"
                    : "text-[hsl(240_10%_68%)] hover:text-[hsl(0_0%_96%)] hover:bg-[hsl(235_28%_16%)]"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-[13px] leading-tight truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AdminSidebarUnifiedProps {
  /** When rendered inside the mobile drawer, navigation also closes the drawer */
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminSidebarUnified({ onNavigate, className, collapsed = false, onCollapsedChange }: AdminSidebarUnifiedProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = React.useState("");
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const stored = loadOpenGroups();
    if (stored) return stored;
    const initial: Record<string, boolean> = {};
    adminNavGroups.forEach((g) => (initial[g.id] = g.id === "overview" || g.id === "trading"));
    return initial;
  });

  // Ensure the group containing the current route is always expanded
  React.useEffect(() => {
    const g = getAdminGroupForPath(location.pathname);
    if (g && !openGroups[g.id]) {
      setOpenGroups((prev) => ({ ...prev, [g.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      /* ignore */
    }
  }, [openGroups]);

  const toggle = (id: string) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleNavigate = (url: string) => {
    navigate(url);
    onNavigate?.();
  };

  const q = query.trim().toLowerCase();
  const filteredGroups = adminNavGroups
    .map((g) => ({
      group: g,
      items: q
        ? g.items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.url.toLowerCase().includes(q) ||
              g.label.toLowerCase().includes(q) ||
              i.keywords?.some((k) => k.toLowerCase().includes(q))
          )
        : g.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn("min-w-0 flex-col bg-[hsl(235_28%_10%)] border-r border-[hsl(235_20%_22%/0.25)] transition-[width] duration-200", className)}
      aria-label="Admin navigation"
    >
      {/* Brand */}
      <div className={cn("min-w-0 shrink-0 border-b border-[hsl(235_20%_22%/0.25)]", collapsed ? "px-2 py-3" : "px-4 pb-3 pt-4")}>
        <div className={cn("flex min-w-0 items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
          {!collapsed && <BrandLogoBlink />}
          {onCollapsedChange && (
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[hsl(240_10%_65%)] transition-colors hover:bg-[hsl(235_28%_18%)] hover:text-[hsl(0_0%_95%)]"
              aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          )}
        </div>
        {!collapsed && <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(240_10%_50%)]">Admin Console</p>}
      </div>

      {/* Search */}
      <div className={cn("shrink-0 py-3", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => onCollapsedChange?.(false)}
            className="flex h-10 w-full items-center justify-center rounded-lg border border-[hsl(235_20%_22%/0.4)] bg-[hsl(235_28%_14%)] text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_95%)]"
            aria-label="Expand sidebar to search pages"
            title="Search admin pages"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_10%_45%)] pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            aria-label="Search admin pages"
            className="w-full h-9 pl-8 pr-8 rounded-lg bg-[hsl(235_28%_14%)] border border-[hsl(235_20%_22%/0.4)] text-[13px] text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_10%_45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(262_100%_65%/0.5)] focus:border-transparent [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_95%)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        )}
      </div>

      {/* Groups */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-6 scrollbar-thin scrollbar-thumb-[hsl(235_20%_22%)] scrollbar-track-transparent"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {filteredGroups.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[hsl(240_10%_50%)]">No pages match “{query}”</p>
        ) : (
          filteredGroups.map(({ group, items }) => (
            <NavGroup
              key={group.id}
              group={group}
              items={items}
              open={q ? true : !!openGroups[group.id]}
              onToggle={() => toggle(group.id)}
              pathname={location.pathname}
              onNavigate={handleNavigate}
              collapsed={collapsed}
            />
          ))
        )}
      </nav>
    </aside>
  );
}
