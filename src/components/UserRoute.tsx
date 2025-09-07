import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { hasLocalSecurity } from "@/utils/localSecurityStorage";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { user, session, loading } = useAuthUser();
  const { wallet, isConnected } = useWeb3();
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

  // Allow access if any of these conditions are met:
  // 1. User has a Supabase session
  // 2. User has a connected web3 wallet
  // 3. User has local security configured (PIN setup)
  const hasAccess = !!(user && session) || isConnected || hasLocalSecurity();

  if (!hasAccess) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;