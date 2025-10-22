import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FixBadgeBonus() {
  const [userId, setUserId] = useState("364415f7-fa4b-42ff-b416-8eab8e4402c4");
  const [badgeName, setBadgeName] = useState("i-Smart VIP");
  const [bonusAmount, setBonusAmount] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFix = async () => {
    if (!userId || !badgeName || !bonusAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('fix-badge-bonus', {
        body: {
          user_id: userId,
          badge_name: badgeName,
          bonus_amount: parseInt(bonusAmount)
        }
      });

      if (error) throw error;

      setResult({
        success: true,
        message: data.message || "Badge bonus credited successfully"
      });
      toast.success("Badge bonus credited successfully");
    } catch (error: any) {
      console.error('Fix badge bonus error:', error);
      setResult({
        success: false,
        message: error.message || "Failed to credit badge bonus"
      });
      toast.error(error.message || "Failed to credit badge bonus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fix Missing Badge Bonus</CardTitle>
        <CardDescription>
          Credit missing holding balance bonus for purchased VIP badges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool fixes users who purchased i-Smart VIP but didn't receive their 10,000 BSK holding bonus.
            Use with caution - it will add 10,000 BSK to the user's holding balance and create a ledger entry.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="badgeName">Badge Name</Label>
          <Input
            id="badgeName"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            placeholder="e.g., i-Smart VIP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonusAmount">Bonus Amount (BSK)</Label>
          <Input
            id="bonusAmount"
            type="number"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            placeholder="10000"
          />
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleFix}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Processing..." : "Credit Badge Bonus"}
        </Button>
      </CardContent>
    </Card>
  );
}
