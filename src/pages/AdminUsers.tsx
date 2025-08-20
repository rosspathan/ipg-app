import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Check, X, Lock, Unlock, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  kyc_status: string;
  account_status: string;
  two_fa_enabled: boolean;
  withdrawal_locked: boolean;
  created_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
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

  const handleKycAction = async (userId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: action })
        .eq('user_id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: `kyc_${action}`,
        p_resource_type: 'profile',
        p_resource_id: userId,
      });

      toast({
        title: "Success",
        description: `KYC ${action} successfully`,
      });
      
      loadUsers();
    } catch (error) {
      console.error('Error updating KYC:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive",
      });
    }
  };

  const handleAccountAction = async (userId: string, action: 'frozen' | 'active') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: action })
        .eq('user_id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: `account_${action}`,
        p_resource_type: 'profile',
        p_resource_id: userId,
      });

      toast({
        title: "Success",
        description: `Account ${action} successfully`,
      });
      
      loadUsers();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
      });
    }
  };

  const handleWithdrawalLock = async (userId: string, locked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ withdrawal_locked: locked })
        .eq('user_id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: locked ? 'withdrawal_locked' : 'withdrawal_unlocked',
        p_resource_type: 'profile',
        p_resource_id: userId,
      });

      toast({
        title: "Success",
        description: `Withdrawals ${locked ? 'locked' : 'unlocked'} successfully`,
      });
      
      loadUsers();
    } catch (error) {
      console.error('Error updating withdrawal lock:', error);
      toast({
        title: "Error",
        description: "Failed to update withdrawal lock",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, type: 'kyc' | 'account') => {
    const kycVariants = {
      pending: "bg-yellow-100 text-yellow-800" as const,
      approved: "bg-green-100 text-green-800" as const,
      rejected: "bg-red-100 text-red-800" as const,
    };
    
    const accountVariants = {
      active: "bg-green-100 text-green-800" as const,
      frozen: "bg-red-100 text-red-800" as const,
      suspended: "bg-red-100 text-red-800" as const,
    };

    if (type === 'kyc') {
      const className = kycVariants[status as keyof typeof kycVariants] || "bg-gray-100 text-gray-800";
      return <Badge variant="secondary" className={className}>{status}</Badge>;
    } else {
      const className = accountVariants[status as keyof typeof accountVariants] || "bg-gray-100 text-gray-800";
      return <Badge variant="secondary" className={className}>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Withdrawals</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.user_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.kyc_status, 'kyc')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.account_status, 'account')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.two_fa_enabled ? "default" : "secondary"}>
                      {user.two_fa_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.withdrawal_locked ? "destructive" : "default"}>
                      {user.withdrawal_locked ? "Locked" : "Unlocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {user.kyc_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleKycAction(user.user_id, 'approved')}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleKycAction(user.user_id, 'rejected')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccountAction(
                          user.user_id, 
                          user.account_status === 'active' ? 'frozen' : 'active'
                        )}
                      >
                        {user.account_status === 'active' ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdrawalLock(user.user_id, !user.withdrawal_locked)}
                      >
                        {user.withdrawal_locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;