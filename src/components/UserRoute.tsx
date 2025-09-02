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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default UserRoute;