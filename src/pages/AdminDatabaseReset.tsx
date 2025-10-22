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
    resetBalances: true,
    resetTransactions: true,
    resetUsers: true,
  });
  const [results, setResults] = useState<any>(null);

  const handleReset = async () => {
    if (confirmText !== "RESET_DATABASE_CONFIRM") {
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

      const response = await supabase.functions.invoke('admin-reset-database', {
        body: {
          confirmToken: confirmText,
          resetBalances: options.resetBalances,
          resetTransactions: options.resetTransactions,
          resetUsers: options.resetUsers,
        },
      });

      if (response.error) {
        throw response.error;
      }

      setResults(response.data);

      if (response.data.success) {
        toast({
          title: "Database Reset Complete",
          description: "Selected database operations completed successfully",
        });
        setConfirmText("");
      } else {
        toast({
          title: "Reset Failed",
          description: response.data.error || "Failed to reset database",
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
        <h1 className="text-3xl font-bold text-destructive">⚠️ Database Reset</h1>
        <p className="text-muted-foreground mt-2">
          Reset various parts of the database for testing purposes.
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
          <div className="space-y-3">
            <p className="text-sm font-medium">Check options:</p>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-balances"
                checked={options.resetBalances}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetBalances: checked as boolean })
                }
              />
              <Label
                htmlFor="reset-balances"
                className="text-sm font-normal cursor-pointer"
              >
                Reset Balances (BSK + Wallet)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-transactions"
                checked={options.resetTransactions}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetTransactions: checked as boolean })
                }
              />
              <Label
                htmlFor="reset-transactions"
                className="text-sm font-normal cursor-pointer"
              >
                Reset Transactions (Orders, Trades, Program Activity)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-users"
                checked={options.resetUsers}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetUsers: checked as boolean })
                }
              />
              <Label
                htmlFor="reset-users"
                className="text-sm font-normal cursor-pointer"
              >
                Reset Users (Delete all non-admin users)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type: <code className="font-mono bg-muted px-2 py-1 rounded">RESET_DATABASE_CONFIRM</code>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET_DATABASE_CONFIRM"
              className="font-mono"
            />
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleReset}
            disabled={loading || confirmText !== "RESET_DATABASE_CONFIRM"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting All Balances...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset Database
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This action cannot be undone. Selected data will be permanently deleted.
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
                    {results.usersDeleted !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Users Deleted</p>
                        <p className="text-2xl font-bold">{results.usersDeleted}</p>
                      </div>
                    )}
                    {results.balancesReset !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Balances Reset</p>
                        <p className="text-2xl font-bold">{results.balancesReset}</p>
                      </div>
                    )}
                    {results.transactionsDeleted !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Transactions Deleted</p>
                        <p className="text-2xl font-bold">{results.transactionsDeleted}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    ✓ {results.message}
                  </div>
                  {results.errors && results.errors.length > 0 && (
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠ Some operations had warnings:
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {results.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
