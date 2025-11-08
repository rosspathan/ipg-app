import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrphanedUsersTable } from "@/components/admin/OrphanedUsersTable";
import { OrphanedUsersCleanupDialog } from "@/components/admin/OrphanedUsersCleanupDialog";
import { ForceDeleteByEmailDialog } from "@/components/admin/ForceDeleteByEmailDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle, Trash2, RefreshCw } from "lucide-react";

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function OrphanedUsersCleanup() {
  const [loading, setLoading] = useState(true);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    fetchOrphanedUsers();
  }, []);

  const fetchOrphanedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-cleanup-orphaned-users', {
        method: 'GET'
      });

      if (error) throw error;

      setOrphanedUsers(data.orphaned_users || []);
      console.log(`Found ${data.count} orphaned users`);
    } catch (error: any) {
      console.error("Failed to fetch orphaned users:", error);
      toast.error(`Failed to fetch orphaned users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async ({ hardDelete, cleanAll = false }: { hardDelete: boolean; cleanAll?: boolean }) => {
    try {
      setCleanupLoading(true);
      
      const maxCount = cleanAll ? 1000 : 200;
      const toastMsg = cleanAll ? 'Cleaning all orphaned users...' : 'Cleaning orphaned users...';
      toast.loading(toastMsg, { id: 'cleanup-progress' });

      const { data, error } = await supabase.functions.invoke('admin-cleanup-orphaned-users', {
        method: 'POST',
        body: {
          dry_run: false,
          max_count: maxCount,
          soft_delete: !hardDelete,
          whitelist: [] // Admin emails would be protected at the system level
        }
      });

      if (error) throw error;

      const { deleted_count, error_count, neutralized_count, errors } = data;
      toast.dismiss('cleanup-progress');

      if (error_count > 0) {
        console.error("Cleanup errors:", errors);
        toast.error(`Cleanup completed with ${error_count} error(s). Deleted: ${deleted_count}, Neutralized: ${neutralized_count}.`);
      } else {
        toast.success(`Cleaned: ${deleted_count} deleted, ${neutralized_count} neutralized`, {
          description: "Affected emails can now re-register"
        });
      }

      // Refresh the list
      await fetchOrphanedUsers();
    } catch (error: any) {
      console.error("Cleanup failed:", error);
      toast.dismiss('cleanup-progress');
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleForceDelete = async ({ emails, hardDelete, dryRun }: { emails: string[]; hardDelete: boolean; dryRun: boolean }) => {
    try {
      setCleanupLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-force-delete-users', {
        method: 'POST',
        body: {
          emails,
          dry_run: dryRun,
          soft_delete: !hardDelete,
          remove_profiles: true,
        }
      });
      if (error) throw error;
      const { deleted_count, neutralized_count, skipped_count, matched_count, error_count, errors } = data;
      if (error_count > 0) {
        console.error('Force delete errors:', errors);
        toast.error(`Force delete: ${error_count} error(s). Matched ${matched_count}, Deleted ${deleted_count}, Neutralized ${neutralized_count}, Skipped ${skipped_count}.`);
      } else {
        toast.success(`Force delete: Matched ${matched_count}, Deleted ${deleted_count}, Neutralized ${neutralized_count}, Skipped ${skipped_count}`);
      }
      await fetchOrphanedUsers();
    } catch (err: any) {
      console.error('Force delete failed:', err);
      toast.error(`Force delete failed: ${err.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Orphaned Users Cleanup</h1>
        <p className="text-muted-foreground">
          Remove users that exist in authentication but have no profile records
        </p>
      </div>

      {orphanedUsers.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> {orphanedUsers.length} orphaned user{orphanedUsers.length !== 1 ? 's' : ''} detected. 
            These users cannot create accounts because their emails are registered in auth but have no profile data.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>All Clear:</strong> No orphaned users found. All authentication records have corresponding profiles.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orphaned Users</CardTitle>
              <CardDescription>
                Users in auth.users without corresponding profiles table records
              </CardDescription>
            </div>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={fetchOrphanedUsers}
                 disabled={loading}
               >
                 <RefreshCw className="h-4 w-4 mr-2" />
                 Refresh
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setForceDialogOpen(true)}
                 disabled={cleanupLoading}
               >
                 Force Delete by Email
               </Button>
               {orphanedUsers.length > 0 && (
                 <>
                   <Button
                     variant="destructive"
                     size="sm"
                     onClick={() => setDialogOpen(true)}
                     disabled={cleanupLoading}
                   >
                     <Trash2 className="h-4 w-4 mr-2" />
                     Clean Up ({Math.min(orphanedUsers.length, 200)})
                   </Button>
                   {orphanedUsers.length > 200 && (
                     <Button
                       variant="destructive"
                       size="sm"
                       onClick={() => handleCleanup({ hardDelete: true, cleanAll: true })}
                       disabled={cleanupLoading}
                     >
                       {cleanupLoading ? (
                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       ) : (
                         <Trash2 className="h-4 w-4 mr-2" />
                       )}
                       Clean Up All ({orphanedUsers.length})
                     </Button>
                   )}
                 </>
               )}
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrphanedUsersTable users={orphanedUsers} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How This Happens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Orphaned users occur when:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Users are deleted directly from the database instead of using the proper deletion tools</li>
            <li>The profiles table record is deleted but the auth.users record remains</li>
            <li>A bulk deletion operation fails partway through</li>
            <li>Manual database cleanup removes profiles without removing auth records</li>
          </ul>
          <p className="pt-3">
            <strong>Why this is a problem:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Users cannot create new accounts with these email addresses</li>
            <li>Sign-up attempts show "Email already registered" errors</li>
            <li>Authentication system becomes inconsistent with application data</li>
          </ul>
          <p className="pt-3">
            <strong>Prevention:</strong> Always use the "Force Delete User" button in Admin &gt; Users, which properly removes users from both auth and application tables.
          </p>
        </CardContent>
      </Card>

      <OrphanedUsersCleanupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orphanedCount={orphanedUsers.length}
        onConfirm={handleCleanup}
      />

      <ForceDeleteByEmailDialog
        open={forceDialogOpen}
        onOpenChange={setForceDialogOpen}
        onConfirm={handleForceDelete}
      />
    </div>
  );
}
