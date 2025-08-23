import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Search, Edit, Shield, Lock, UserX, UserCheck, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  display_name: string | null;
  account_frozen: boolean;
  withdrawal_locked: boolean;
  created_at: string;
  updated_at: string;
  kyc_status: string;
  kyc_notes: string | null;
  has_2fa: boolean;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          phone,
          full_name,
          display_name,
          account_frozen,
          withdrawal_locked,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get KYC and security data separately due to type constraints
      const userProfiles: UserProfile[] = [];
      
      for (const user of data || []) {
        // Get KYC status
        const { data: kycData } = await (supabase as any)
          .from('kyc_profiles')
          .select('status, notes')
          .eq('user_id', user.user_id)
          .single();

        // Get security data
        const { data: securityData } = await (supabase as any)
          .from('security')
          .select('has_2fa, role')
          .eq('user_id', user.user_id)
          .single();

        userProfiles.push({
          user_id: user.user_id,
          email: user.email || '',
          phone: user.phone,
          full_name: user.full_name,
          display_name: user.display_name,
          account_frozen: user.account_frozen || false,
          withdrawal_locked: user.withdrawal_locked || false,
          created_at: user.created_at,
          updated_at: user.updated_at,
          kyc_status: kycData?.status || 'unverified',
          kyc_notes: kycData?.notes,
          has_2fa: securityData?.has_2fa || false,
          role: securityData?.role || 'user',
        });
      }

      setUsers(userProfiles);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const auditAction = async (action: string, userId: string, before: any, after: any) => {
    await (supabase as any)
      .from('admin_audit')
      .insert({
        actor: 'admin',
        action,
        entity: 'user',
        entity_id: userId,
        before,
        after,
      });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const before = users.find(u => u.user_id === editingUser.user_id);
      
      // Update profiles table
      await supabase
        .from('profiles')
        .update({
          display_name: editingUser.display_name,
          phone: editingUser.phone,
          account_frozen: editingUser.account_frozen,
          withdrawal_locked: editingUser.withdrawal_locked,
        })
        .eq('user_id', editingUser.user_id);

      // Update or insert KYC profile
      await (supabase as any)
        .from('kyc_profiles')
        .upsert({
          user_id: editingUser.user_id,
          status: editingUser.kyc_status,
          notes: editingUser.kyc_notes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      // Update or insert security settings
      await (supabase as any)
        .from('security')
        .upsert({
          user_id: editingUser.user_id,
          role: editingUser.role,
          has_2fa: editingUser.has_2fa,
          withdrawal_locked: editingUser.withdrawal_locked,
        }, {
          onConflict: 'user_id'
        });

      await auditAction('user_updated', editingUser.user_id, before, editingUser);

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setSheetOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleToggleAction = async (userId: string, field: keyof UserProfile, value: boolean, label: string) => {
    try {
      const before = users.find(u => u.user_id === userId);
      
      if (field === 'account_frozen' || field === 'withdrawal_locked') {
        await supabase
          .from('profiles')
          .update({ [field]: value })
          .eq('user_id', userId);
      } else if (field === 'has_2fa') {
        await (supabase as any)
          .from('security')
          .upsert({
            user_id: userId,
            [field]: value,
          }, {
            onConflict: 'user_id'
          });
      }

      await auditAction(`${field}_${value ? 'enabled' : 'disabled'}`, userId, before, { [field]: value });

      toast({
        title: "Success",
        description: `${label} ${value ? 'enabled' : 'disabled'} successfully`,
      });

      loadUsers();
    } catch (error: any) {
      console.error(`Error toggling ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to toggle ${label}`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      unverified: 'outline',
      pending: 'secondary',
      verified: 'default',
      rejected: 'destructive',
      active: 'default',
      frozen: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.includes(searchTerm)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by email, name, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Withdrawals</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{user.display_name || user.full_name || user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-muted-foreground">{user.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.kyc_status)}</TableCell>
                    <TableCell>{getStatusBadge(user.account_frozen ? 'frozen' : 'active')}</TableCell>
                    <TableCell>
                      <Badge variant={user.has_2fa ? 'default' : 'outline'}>
                        {user.has_2fa ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.withdrawal_locked ? 'destructive' : 'default'}>
                        {user.withdrawal_locked ? 'Locked' : 'Unlocked'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Sheet open={sheetOpen && editingUser?.user_id === user.user_id} onOpenChange={setSheetOpen}>
                          <SheetTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setSheetOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-md">
                            <SheetHeader>
                              <SheetTitle>Edit User</SheetTitle>
                            </SheetHeader>
                            {editingUser && (
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className="text-sm font-medium">Display Name</label>
                                  <Input
                                    value={editingUser.display_name || ''}
                                    onChange={(e) => setEditingUser({
                                      ...editingUser,
                                      display_name: e.target.value
                                    })}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Phone</label>
                                  <Input
                                    value={editingUser.phone || ''}
                                    onChange={(e) => setEditingUser({
                                      ...editingUser,
                                      phone: e.target.value
                                    })}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Role</label>
                                  <Select
                                    value={editingUser.role}
                                    onValueChange={(value) => setEditingUser({
                                      ...editingUser,
                                      role: value
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">KYC Status</label>
                                  <Select
                                    value={editingUser.kyc_status}
                                    onValueChange={(value) => setEditingUser({
                                      ...editingUser,
                                      kyc_status: value
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unverified">Unverified</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="verified">Verified</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">KYC Notes</label>
                                  <Textarea
                                    value={editingUser.kyc_notes || ''}
                                    onChange={(e) => setEditingUser({
                                      ...editingUser,
                                      kyc_notes: e.target.value
                                    })}
                                    rows={3}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">Account Frozen</label>
                                  <Switch
                                    checked={editingUser.account_frozen}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      account_frozen: checked
                                    })}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">Withdrawal Locked</label>
                                  <Switch
                                    checked={editingUser.withdrawal_locked}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      withdrawal_locked: checked
                                    })}
                                  />
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={handleSaveUser} className="flex-1">
                                    Save Changes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSheetOpen(false);
                                      setEditingUser(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAction(
                            user.user_id,
                            'withdrawal_locked',
                            !user.withdrawal_locked,
                            'Withdrawal Lock'
                          )}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAction(
                            user.user_id,
                            'has_2fa',
                            false,
                            '2FA Reset'
                          )}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAction(
                            user.user_id,
                            'account_frozen',
                            !user.account_frozen,
                            'Account Status'
                          )}
                        >
                          {user.account_frozen ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;