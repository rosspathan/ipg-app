import { useAuthUser } from "@/hooks/useAuthUser";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { user, session, loading } = useAuthUser();
  const location = useLocation();

  // Removed redundant loading screen - AppInitializer handles this
  // Just immediately check access without showing loader

  // Session-based access control: Users must be authenticated via Supabase
  // Wallet linking is optional and handled separately
  const hasAccess = !!session;

  if (!hasAccess) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;