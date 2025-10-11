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
          confirmToken: "RESET_DATABASE_CONFIRM",
          ...options,
        },
      });

      if (response.error) {
        throw response.error;
      }

      setResults(response.data);

      if (response.data.success) {
        toast({
          title: "Database Reset Complete",
          description: "The database has been reset successfully",
        });
        setConfirmText("");
      } else {
        toast({
          title: "Reset Completed with Errors",
          description: "Some operations failed. Check the results below.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset database",
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
          Dangerous operation: This will delete data from the database. Use with extreme caution.
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reset Options */}
        <Card>
          <CardHeader>
            <CardTitle>Reset Options</CardTitle>
            <CardDescription>Select what to reset in the database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="reset-users"
                checked={options.resetUsers}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetUsers: checked as boolean })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="reset-users" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Delete All Non-Admin Users
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently removes all user accounts except admins
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="reset-balances"
                checked={options.resetBalances}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetBalances: checked as boolean })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="reset-balances" className="flex items-center gap-2 cursor-pointer">
                  <DollarSign className="h-4 w-4" />
                  Reset All Balances to Zero
                </Label>
                <p className="text-sm text-muted-foreground">
                  Resets BSK and wallet balances for all users
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="reset-transactions"
                checked={options.resetTransactions}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, resetTransactions: checked as boolean })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="reset-transactions" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Clear Transaction History
                </Label>
                <p className="text-sm text-muted-foreground">
                  Deletes trades, orders, spins, draws, and referral events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Confirmation Required</CardTitle>
            <CardDescription>Type the confirmation text to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Type: <code className="font-mono">RESET_DATABASE_CONFIRM</code>
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
              className="w-full"
              onClick={handleReset}
              disabled={loading || confirmText !== "RESET_DATABASE_CONFIRM"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Database...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset Database
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This action cannot be undone. All selected data will be permanently deleted.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Reset Results</CardTitle>
            <CardDescription>
              {results.success ? "All operations completed successfully" : "Some operations failed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.operations?.map((op: string, i: number) => (
                <div key={i} className="text-sm text-green-600 dark:text-green-400">
                  {op}
                </div>
              ))}
              {results.errors?.map((error: string, i: number) => (
                <div key={i} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
