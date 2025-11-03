import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, CheckCircle2, Loader2, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DeleteResult {
  success: boolean;
  deletedAuthUser: boolean;
  deletedProfile: boolean;
  tablesCleared: string[];
  errors: string[];
}

export default function AdminUserCleanup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [specificEmails, setSpecificEmails] = useState("");
  const [results, setResults] = useState<DeleteResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [dryRun, setDryRun] = useState(false);
  const [serverSummary, setServerSummary] = useState<any>(null);

  // Delete all non-admin users
  const handleDeleteAllUsers = async () => {
    if (confirmText !== "DELETE ALL USERS") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "DELETE ALL USERS" to confirm',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setServerSummary(null);
    setProgress(0);

    try {
      if (dryRun) {
        // Dry run: just fetch counts, don't delete
        const { data, error } = await supabase.functions.invoke('admin-reset-database', {
          body: {
            confirmToken: 'RESET_DATABASE_CONFIRM',
            resetUsers: false, // Don't actually delete
            resetBalances: false,
            resetTransactions: false,
          },
        });

        if (error) throw error;

        setServerSummary(data);
        setProgress(100);
        
        const results: DeleteResult[] = [{
          success: true,
          deletedAuthUser: false,
          deletedProfile: false,
          tablesCleared: [],
          errors: [`[DRY RUN] Would delete ${data.counts?.non_admin_users || 0} non-admin users`],
        }];
        
        setResults(results);

        toast({
          title: "Dry Run Complete",
          description: `Would delete ${data.counts?.non_admin_users || 0} non-admin users. No changes made.`,
        });
      } else {
        // Real deletion: use bulk reset
        const { data, error } = await supabase.functions.invoke('admin-reset-database', {
          body: {
            confirmToken: 'RESET_DATABASE_CONFIRM',
            resetUsers: true,
            resetBalances: true,
            resetTransactions: true,
          },
        });

        if (error) throw error;

        setServerSummary(data);
        setProgress(100);

        const results: DeleteResult[] = [{
          success: true,
          deletedAuthUser: true,
          deletedProfile: true,
          tablesCleared: [],
          errors: [`Deleted ${data.deleted_auth_users || 0} auth users, ${data.deleted_profiles || 0} profiles`],
        }];
        
        setResults(results);

        toast({
          title: "Deletion Complete",
          description: `Successfully deleted ${data.deleted_auth_users || 0} users and all their data. Refresh the Users page to see changes.`,
        });
      }

      setConfirmText("");
    } catch (error: any) {
      console.error('Error during deletion:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete specific users by email
  const handleDeleteSpecificUsers = async () => {
    if (!specificEmails.trim()) {
      toast({
        title: "No Emails Provided",
        description: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);

    try {
      const emails = specificEmails
        .split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      toast({
        title: "Starting Deletion",
        description: `Deleting ${emails.length} users...`,
      });

      const deletionResults: DeleteResult[] = [];
      let processed = 0;

      for (const email of emails) {
        if (dryRun) {
          deletionResults.push({
            success: true,
            deletedAuthUser: false,
            deletedProfile: false,
            tablesCleared: [],
            errors: [`[DRY RUN] Would delete: ${email}`],
          });
        } else {
          const { data, error } = await supabase.functions.invoke('admin-delete-user', {
            body: {
              email,
              confirm: 'DELETE',
              confirmForce: false,
            },
          });

          deletionResults.push(error ? {
            success: false,
            deletedAuthUser: false,
            deletedProfile: false,
            tablesCleared: [],
            errors: [error.message],
          } : data);
        }

        processed++;
        setProgress((processed / emails.length) * 100);
      }

      setResults(deletionResults);

      toast({
        title: dryRun ? "Dry Run Complete" : "Deletion Complete",
        description: `${deletionResults.filter(r => r.success).length}/${emails.length} users ${dryRun ? 'would be' : 'were'} deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSpecificEmails("");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Cleanup</h1>
          <p className="text-muted-foreground">Manage test user deletion and database cleanup</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-destructive" />
          <Badge variant="destructive">Admin Only</Badge>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> User deletion is permanent and cannot be undone. All user data, including
          balances, transactions, referrals, and badges will be permanently deleted. Admin users are protected
          by default.
        </AlertDescription>
      </Alert>

      {dryRun && (
        <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Dry Run Mode is ON</strong> — No deletions will be made. This will only preview what would be deleted.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bulk">Delete All Users</TabsTrigger>
          <TabsTrigger value="specific">Delete Specific Users</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete All Non-Admin Users
              </CardTitle>
              <CardDescription>
                Permanently delete all non-admin users from the system. Admin users are automatically protected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRunBulk"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="dryRunBulk">Dry Run (show what would be deleted without actually deleting)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmBulk">
                  Type <strong>DELETE ALL USERS</strong> to confirm
                </Label>
                <Input
                  id="confirmBulk"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE ALL USERS"
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleDeleteAllUsers}
                disabled={loading || confirmText !== "DELETE ALL USERS"}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dryRun ? "Running Dry Run..." : "Deleting Users..."}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {dryRun ? "Run Dry Run (No Deletions)" : "Delete All Non-Admin Users"}
                  </>
                )}
              </Button>

              {serverSummary && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Server Summary:</h3>
                  <div className="text-sm space-y-1">
                    {dryRun ? (
                      <>
                        <p><strong>[DRY RUN]</strong> Would delete {serverSummary.counts?.non_admin_users || 0} non-admin users</p>
                        <p>Admin users: {serverSummary.counts?.admin_users || 0}</p>
                        <p className="text-muted-foreground mt-2">No changes were made</p>
                      </>
                    ) : (
                      <>
                        <p>Deleted auth users: <strong>{serverSummary.deleted_auth_users || 0}</strong></p>
                        <p>Deleted profiles: <strong>{serverSummary.deleted_profiles || 0}</strong></p>
                        <p>Remaining auth users: <strong>{serverSummary.remaining_auth_users || 0}</strong></p>
                        <p>Remaining profiles: <strong>{serverSummary.remaining_profiles || 0}</strong></p>
                        <p className="text-green-600 dark:text-green-400 mt-2 font-semibold">
                          ✓ Deletion completed successfully
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          Refresh the Users page to see updated counts
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specific" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Delete Specific Users
              </CardTitle>
              <CardDescription>
                Enter email addresses (one per line) of users to delete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRunSpecific"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="dryRunSpecific">Dry Run (show what would be deleted without actually deleting)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emails">User Emails (one per line)</Label>
                <Textarea
                  id="emails"
                  value={specificEmails}
                  onChange={(e) => setSpecificEmails(e.target.value)}
                  placeholder="test.user1@example.com&#10;test.user2@example.com&#10;test.user3@example.com"
                  rows={8}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleDeleteSpecificUsers}
                disabled={loading || !specificEmails.trim()}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting Users...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {dryRun ? "Run Dry Run" : "Delete Selected Users"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <Card>
          <CardHeader>
            <CardTitle>Deletion Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Deletion Report
            </CardTitle>
            <CardDescription>
              Summary of deletion operation ({results.filter(r => r.success).length}/{results.length} successful)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.tablesCleared.length} tables cleared
                    </span>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.map((error, i) => (
                        <p key={i} className="text-sm text-muted-foreground">{error}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
