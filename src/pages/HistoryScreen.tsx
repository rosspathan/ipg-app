import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { UnifiedActivityHistory } from "@/components/activity/UnifiedActivityHistory";

const HistoryScreen = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/wallet")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity History</h1>
            <p className="text-sm text-muted-foreground">
              Complete history of all your BSK transactions and program activities
            </p>
          </div>
        </div>

        {/* Unified Activity History Component */}
        <UnifiedActivityHistory userId={user?.id} />
      </div>
    </div>
  );
};

export default HistoryScreen;
