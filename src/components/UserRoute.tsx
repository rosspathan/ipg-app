import React from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { session, loading } = useAuthUser();
  const location = useLocation();

  const fromLogin = (location.state as any)?.fromLogin;
  const loginInProgress = !!sessionStorage.getItem('login_in_progress');

  // If we're navigating right after login or auth is initializing, wait instead of bouncing back to /auth/login
  if (loading || (!session && (fromLogin || loginInProgress))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;