import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, AlertTriangle, Trash2, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CleanupOptions {
  resetUsers: boolean;
  resetBalances: boolean;
  resetTransactions: boolean;
}

interface CleanupResults {
  success: boolean;
  operations: string[];
  errors: string[];
}

interface DatabaseStats {
  totalUsers: number;
  totalBSK: number;
  totalTransactions: number;
  totalParticipations: number;
}

export default function AdminDatabaseCleanup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<CleanupResults | null>(null);
  
  const [options, setOptions] = useState<CleanupOptions>({
    resetUsers: false,
    resetBalances: true,
    resetTransactions: true,
  });

  // Fetch current database statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['database-stats'],
    queryFn: async () => {
      // Get total users (excluding admins)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'in', `(SELECT user_id FROM user_roles WHERE role = 'admin')`);

      // Get total BSK in circulation
      const { data: bskData } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance');
      
      const totalBSK = bskData?.reduce(
        (sum, row) => sum + Number(row.withdrawable_balance || 0) + Number(row.holding_balance || 0),
        0
      ) || 0;

      // Get total transaction count
      const { count: tradesCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });

      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get program participation count
      const { count: participationCount } = await supabase
        .from('user_program_participations')
        .select('*', { count: 'exact', head: true });

      return {
        totalUsers: usersCount || 0,
        totalBSK: Math.round(totalBSK),
        totalTransactions: (tradesCount || 0) + (ordersCount || 0),
        totalParticipations: participationCount || 0,
      } as DatabaseStats;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleCleanup = async () => {
    if (confirmText !== "CLEAN_SLATE_PRODUCTION") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type the exact confirmation text to proceed.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setShowResults(false);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-database', {
        body: {
          confirmToken: 'RESET_DATABASE_CONFIRM',
          resetUsers: options.resetUsers,
          resetBalances: options.resetBalances,
          resetTransactions: options.resetTransactions,
        },
      });

      if (error) throw error;

      setResults(data);
      setShowResults(true);

      if (data.success) {
        toast({
          title: "Database Cleanup Successful",
          description: `${data.operations.length} operations completed successfully.`,
        });
        
        // Reset form
        setConfirmText("");
        setOptions({
          resetUsers: false,
          resetBalances: true,
          resetTransactions: true,
        });
      } else {
        toast({
          title: "Cleanup Completed with Errors",
          description: `${data.errors.length} operations failed.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConfirmValid = confirmText === "CLEAN_SLATE_PRODUCTION";
  const hasSelectedOptions = options.resetUsers || options.resetBalances || options.resetTransactions;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="h-8 w-8" />
          Database Cleanup
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive database management and cleanup system for production testing
        </p>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>CRITICAL WARNING:</strong> This operation is irreversible and will permanently delete data.
          Only use this before production testing with a clean slate. All admin accounts will be preserved.
        </AlertDescription>
      </Alert>

      {/* Current Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Excluding admins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total BSK
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalBSK.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">In circulation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Trades + Orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Participations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalParticipations || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Program entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Cleanup Options
          </CardTitle>
          <CardDescription>
            Select what data you want to reset. Admin accounts are always preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="resetUsers"
              checked={options.resetUsers}
              onCheckedChange={(checked) =>
                setOptions({ ...options, resetUsers: checked as boolean })
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="resetUsers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Delete all non-admin users
              </Label>
              <p className="text-sm text-muted-foreground">
                Removes all user accounts except admin accounts. This will also delete their profiles,
                wallets, and associated data.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="resetBalances"
              checked={options.resetBalances}
              onCheckedChange={(checked) =>
                setOptions({ ...options, resetBalances: checked as boolean })
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="resetBalances"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Reset all balances to zero
              </Label>
              <p className="text-sm text-muted-foreground">
                Sets all BSK balances (withdrawable & holding) and crypto wallet balances to 0. Does not
                delete users.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="resetTransactions"
              checked={options.resetTransactions}
              onCheckedChange={(checked) =>
                setOptions({ ...options, resetTransactions: checked as boolean })
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="resetTransactions"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Clear all transaction history
              </Label>
              <p className="text-sm text-muted-foreground">
                Deletes all trades, orders, ad clicks, referral events, spin results, lucky draw tickets,
                and program participation records.
              </p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommended for Clean Testing:</strong> Enable all three options to start with a
              completely clean database. You can then create test users and fund them with BSK from the admin
              panel.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Required</CardTitle>
          <CardDescription>
            Type <strong>CLEAN_SLATE_PRODUCTION</strong> below to confirm this action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmation Text</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type: CLEAN_SLATE_PRODUCTION"
              className="font-mono"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleCleanup}
              disabled={loading || !isConfirmValid || !hasSelectedOptions}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Cleanup...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Execute Database Cleanup
                </>
              )}
            </Button>
          </div>

          {!hasSelectedOptions && (
            <p className="text-sm text-muted-foreground text-center">
              Please select at least one cleanup option above
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && results && (
        <Card>
          <CardHeader>
            <CardTitle className={results.success ? "text-green-600" : "text-red-600"}>
              Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.operations.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ Successful Operations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {results.operations.map((op, idx) => (
                    <li key={idx} className="text-sm">
                      {op}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-600 mb-2">❌ Failed Operations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {results.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-600">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
