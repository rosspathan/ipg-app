import { LayoutDashboard, Users, FolderKanban, TrendingUp, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AdminDockUnifiedProps {
  onCommandOpen: () => void;
}

const dockItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Programs", url: "/admin/programs", icon: FolderKanban },
  { title: "Markets", url: "/admin/markets", icon: TrendingUp },
];

export function AdminDockUnified({ onCommandOpen }: AdminDockUnifiedProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(235_28%_13%)] border-t border-[hsl(235_20%_22%/0.12)] backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto relative">
        {dockItems.map((item, index) => (
          <div key={item.url} className="flex-1">
            {index === 2 && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-8">
                <button
                  onClick={onCommandOpen}
                  className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-fab transition-transform active:scale-95"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>
            )}
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
                  isActive
                    ? "text-[hsl(262_100%_65%)]"
                    : "text-[hsl(240_10%_70%)] active:bg-[hsl(235_28%_15%)]"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          </div>
        ))}
      </div>
    </nav>
  );
}
