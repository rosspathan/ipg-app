import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface DockTab {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
}

const mainTabs: DockTab[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { id: "users", label: "Users", icon: Users, path: "/admin/users" },
  { id: "programs", label: "Programs", icon: FolderKanban, path: "/admin/programs" },
  { id: "settings", label: "Settings", icon: Settings, path: "/admin/settings" },
];

interface QuickAction {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
}

export function AdminDockClean() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickActions: QuickAction[] = [
    {
      label: "New Program",
      icon: FolderKanban,
      onClick: () => {
        setShowQuickAdd(false);
        window.location.href = "/admin/programs/editor/new";
      },
    },
    {
      label: "Manage Users",
      icon: Users,
      onClick: () => {
        setShowQuickAdd(false);
        window.location.href = "/admin/users";
      },
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(220_13%_7%)] border-t border-[hsl(220_13%_14%/0.4)]"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
          paddingTop: "0.5rem",
        }}
      >
        <div className="flex items-center justify-around max-w-screen-xl mx-auto px-2 relative">
          {/* First 2 tabs */}
          {mainTabs.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={tab.path === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-all duration-200 min-w-[4rem]",
                  isActive
                    ? "text-[hsl(262_100%_65%)]"
                    : "text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-6 h-6 transition-all",
                      isActive && "fill-current"
                    )}
                  />
                  {isActive && (
                    <span className="text-xs font-medium">{tab.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Center FAB */}
          <Button
            size="icon"
            onClick={() => setShowQuickAdd(true)}
            className="w-14 h-14 rounded-full bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white shadow-lg -mt-6"
          >
            <Plus className="w-6 h-6" />
          </Button>

          {/* Last 2 tabs */}
          {mainTabs.slice(2, 4).map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-all duration-200 min-w-[4rem]",
                  isActive
                    ? "text-[hsl(262_100%_65%)]"
                    : "text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={cn(
                      "w-6 h-6 transition-all",
                      isActive && "fill-current"
                    )}
                  />
                  {isActive && (
                    <span className="text-xs font-medium">{tab.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Add Sheet */}
      <Sheet open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <SheetContent 
          side="bottom" 
          className="bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%/0.4)]"
        >
          <SheetHeader>
            <SheetTitle className="text-[hsl(0_0%_98%)]">Quick Actions</SheetTitle>
            <SheetDescription className="text-[hsl(220_9%_65%)]">
              Perform common administrative tasks
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                onClick={action.onClick}
                className="h-20 flex-col gap-2 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] hover:bg-[hsl(220_13%_12%)] text-[hsl(0_0%_98%)]"
              >
                <action.icon className="w-6 h-6 text-[hsl(262_100%_65%)]" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
