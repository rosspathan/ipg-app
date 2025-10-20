import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { user, session, loading } = useAuthUser();
  const location = useLocation();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    // Give some time for auth state to stabilize
    const timer = setTimeout(() => {
      setIsCheckingAccess(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Session-based access control: Users must be authenticated via Supabase
  // Wallet linking is optional and handled separately
  const hasAccess = !!session;

  if (!hasAccess) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;