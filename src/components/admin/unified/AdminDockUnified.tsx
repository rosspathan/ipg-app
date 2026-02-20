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
      className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(235_28%_13%)] border-t border-[hsl(235_20%_22%/0.20)] backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center h-16 px-2 max-w-md mx-auto relative">
        {dockItems.map((item, index) => (
          <div key={item.url} className="flex-1 flex justify-center">
            {index === 2 && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button
                  onClick={onCommandOpen}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(262_100%_65%)] to-[hsl(280_100%_60%)] flex items-center justify-center shadow-lg shadow-[hsl(262_100%_65%/0.35)] transition-transform active:scale-95"
                  aria-label="Quick Actions"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-[60px]",
                  index === 2 && "mt-3",
                  isActive
                    ? "text-[hsl(262_100%_65%)]"
                    : "text-[hsl(240_10%_55%)] active:text-[hsl(0_0%_85%)]"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{item.title}</span>
            </NavLink>
          </div>
        ))}
      </div>
    </nav>
  );
}
