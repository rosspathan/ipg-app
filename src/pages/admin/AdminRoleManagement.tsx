import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, UserMinus, Search, History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminRoleManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState<{ userId: string; role: string } | null>(null);

  // Fetch all users with roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-roles', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          display_name,
          user_roles (
            role,
            assigned_at
          )
        `);

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch role audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['role-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_role_audit')
        .select(`
          *,
          profiles:user_id (email),
          performer:performed_by (email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-audit-logs'] });
      toast.success('Role assigned successfully');
      setShowAddDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-audit-logs'] });
      toast.success('Role removed successfully');
      setShowRemoveDialog(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground">
          Manage user roles and permissions across the platform
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users & Roles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Users & Their Roles</CardTitle>
            <CardDescription>
              Search users and manage their role assignments
            </CardDescription>
            <div className="flex gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.display_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.user_roles?.length > 0 ? (
                            user.user_roles.map((r: any) => (
                              <Badge
                                key={r.role}
                                variant={getRoleBadgeVariant(r.role)}
                              >
                                {r.role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser({ id: user.user_id, email: user.email });
                            setShowAddDialog(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        {user.user_roles?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowRemoveDialog({
                                userId: user.user_id,
                                role: user.user_roles[0].role,
                              })
                            }
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Changes
            </CardTitle>
            <CardDescription>Role assignment audit trail</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(log.role)}>
                      {log.role}
                    </Badge>
                    <span className="text-muted-foreground">
                      {log.action}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User: {log.profiles?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    By: {log.performer?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Role Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Role</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser
                ? `Assigning role to ${selectedUser.email}`
                : 'Select a role to assign'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  addRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: selectedRole,
                  });
                }
              }}
              disabled={!selectedUser || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Role Dialog */}
      <AlertDialog
        open={!!showRemoveDialog}
        onOpenChange={() => setShowRemoveDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this role? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showRemoveDialog) {
                  removeRoleMutation.mutate(showRemoveDialog);
                }
              }}
              disabled={removeRoleMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removeRoleMutation.isPending ? 'Removing...' : 'Remove Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
