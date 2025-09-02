import { useEffect, useState } from "react";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface AdminRouteNewProps {
  children: React.ReactNode;
}

const AdminRouteNew = ({ children }: AdminRouteNewProps) => {
  const { user, session, loading, isAdmin } = useAuthAdmin();
  const [web3Admin, setWeb3Admin] = useState<boolean>(false);

  useEffect(() => {
    const flag = localStorage.getItem('cryptoflow_web3_admin') === 'true';
    setWeb3Admin(flag);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!(isAdmin || web3Admin)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRouteNew;