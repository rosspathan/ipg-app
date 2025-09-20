import { Outlet } from "react-router-dom";
import CurvedBottomNav from "@/components/CurvedBottomNav";

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden animate-fade-in-scale">
      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        <Outlet />
      </div>

      {/* Curved Bottom Navigation with FAB */}
      <CurvedBottomNav />
    </div>
  );
};

export default UserLayout;