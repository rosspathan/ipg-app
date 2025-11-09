import React from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Navigate, useLocation } from "react-router-dom";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { session, loading } = useAuthUser();
  const location = useLocation();

  // Wait for auth to initialize to avoid false redirects after fresh sign-in
  if (loading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;