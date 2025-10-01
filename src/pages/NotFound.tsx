import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md space-y-6">
        <div className="text-8xl font-bold text-muted-foreground/20">404</div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page <code className="px-2 py-1 bg-muted rounded text-xs">{location.pathname}</code> doesn't exist.
        </p>
        <Button onClick={() => navigate("/", { replace: true })} className="gap-2">
          <Home className="h-4 w-4" />
          Go to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
