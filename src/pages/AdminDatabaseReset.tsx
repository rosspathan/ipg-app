import { useState } from "react";
import { AlertTriangle, Trash2, Users, DollarSign, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDatabaseReset() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [options, setOptions] = useState({
    resetUsers: false,
    resetBalances: true,
    resetTransactions: true,
  });
  const [results, setResults] = useState<any>(null);

  const handleReset = async () => {
    if (confirmText !== "RESET_ALL_BALANCES") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type the confirmation text exactly as shown",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke('admin-reset-balances', {
        body: {},
      });

      if (response.error) {
        throw response.error;
      }

      setResults(response.data);

      if (response.data.success) {
        toast({
          title: "Balances Reset Complete",
          description: "All user balances have been reset to zero",
        });
        setConfirmText("");
      } else {
        toast({
          title: "Reset Failed",
          description: response.data.error || "Failed to reset balances",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-destructive">⚠️ Reset All User Balances</h1>
        <p className="text-muted-foreground mt-2">
          This will reset all BSK and crypto balances to zero for all users.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          This operation is irreversible and will permanently delete data. Only administrators should use this feature,
          and only when starting fresh or for development/testing purposes.
        </AlertDescription>
      </Alert>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Confirmation Required</CardTitle>
          <CardDescription>
            Type the confirmation text below to reset all user balances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">What will be reset:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>All BSK token balances (withdrawable and holding)</li>
              <li>All crypto wallet balances</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type: <code className="font-mono bg-muted px-2 py-1 rounded">RESET_ALL_BALANCES</code>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET_ALL_BALANCES"
              className="font-mono"
            />
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleReset}
            disabled={loading || confirmText !== "RESET_ALL_BALANCES"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting All Balances...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Balances to Zero
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This action cannot be undone. All user balances will be permanently set to zero.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Reset Results</CardTitle>
            <CardDescription>
              {results.success ? "Operation completed successfully" : "Operation failed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.success && (
                <>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">BSK Records Reset</p>
                      <p className="text-2xl font-bold">{results.bsk_balance_records_reset || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Crypto Records Reset</p>
                      <p className="text-2xl font-bold">{results.crypto_balance_records_reset || 0}</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    ✓ {results.message}
                  </div>
                </>
              )}
              {results.error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  ✗ {results.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
