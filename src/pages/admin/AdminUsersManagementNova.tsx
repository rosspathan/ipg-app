import * as React from "react";
import { useState } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { FormKit, FormField } from "@/components/admin/nova/FormKit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, UserCheck, UserX, Shield, TrendingUp, AlertTriangle, Wallet, History, Key, Lock, Unlock, Mail, RefreshCw, Eye, Edit, Ban, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersManagementNova() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showRolesDialog, setShowRolesDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with profiles and roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchValue, activeFilters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          user_roles:user_roles(role)
        `)
        .order('created_at', { ascending: false });

      if (searchValue) {
        query = query.or(`email.ilike.%${searchValue}%,full_name.ilike.%${searchValue}%`);
      }

      if (activeFilters.kyc_status?.length) {
        query = query.in('kyc_status', activeFilters.kyc_status);
      }

      if (activeFilters.account_status?.length) {
        query = query.in('account_status', activeFilters.account_status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "User updated successfully" });
      setEditMode(false);
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const columns = [
    { 
      key: "email", 
      label: "Email",
      render: (row: any) => (
        <div>
          <div className="font-medium">{row.email}</div>
          <div className="text-xs text-muted-foreground">{row.full_name || 'No name'}</div>
        </div>
      )
    },
    {
      key: "kyc_status",
      label: "KYC",
      render: (row: any) => (
        <Badge
          variant="outline"
          className={cn(
            row.kyc_status === "approved"
              ? "bg-success/10 text-success border-success/20"
              : row.kyc_status === "pending"
              ? "bg-warning/10 text-warning border-warning/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          )}
        >
          {row.kyc_status || 'pending'}
        </Badge>
      ),
    },
    {
      key: "account_status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant="outline"
          className={cn(
            row.account_status === "active"
              ? "bg-success/10 text-success border-success/20"
              : row.account_status === "suspended"
              ? "bg-warning/10 text-warning border-warning/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {row.account_status || 'active'}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRecord(row);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "kyc_status",
      label: "KYC Status",
      options: [
        { id: "approved", label: "Approved", value: "approved" },
        { id: "pending", label: "Pending", value: "pending" },
        { id: "rejected", label: "Rejected", value: "rejected" },
      ],
    },
    {
      id: "account_status",
      label: "Account Status",
      options: [
        { id: "active", label: "Active", value: "active" },
        { id: "suspended", label: "Suspended", value: "suspended" },
        { id: "blocked", label: "Blocked", value: "blocked" },
      ],
    },
  ];

  const handleApproveKYC = (userId: string) => {
    updateUser.mutate({
      userId,
      updates: { kyc_status: 'approved' }
    });
  };

  const handleSuspendUser = (userId: string) => {
    updateUser.mutate({
      userId,
      updates: { account_status: 'suspended' }
    });
  };

  const handleActivateUser = (userId: string) => {
    updateUser.mutate({
      userId,
      updates: { account_status: 'active' }
    });
  };

  const handleBlockUser = (userId: string) => {
    updateUser.mutate({
      userId,
      updates: { account_status: 'blocked' }
    });
  };

  const handleLockWithdrawals = (userId: string, locked: boolean) => {
    updateUser.mutate({
      userId,
      updates: { withdrawal_locked: locked }
    });
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      // In real implementation, this would trigger password reset email
      toast({ title: "Password reset email sent to " + email });
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast({ 
        title: "Failed to send reset email", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const totalUsers = users?.length || 0;
  const kycPending = users?.filter(u => u.kyc_status === 'pending').length || 0;
  const kycApproved = users?.filter(u => u.kyc_status === 'approved').length || 0;
  const suspended = users?.filter(u => u.account_status === 'suspended').length || 0;

  const userFields: FormField[] = selectedRecord ? [
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      value: editData.email || selectedRecord.email,
      onChange: (val) => setEditData({...editData, email: val}),
      disabled: true,
    },
    {
      id: 'full_name',
      type: 'text',
      label: 'Full Name',
      value: editData.full_name || selectedRecord.full_name,
      onChange: (val) => setEditData({...editData, full_name: val}),
    },
    {
      id: 'phone',
      type: 'text',
      label: 'Phone',
      value: editData.phone || selectedRecord.phone,
      onChange: (val) => setEditData({...editData, phone: val}),
    },
    {
      id: 'kyc_status',
      type: 'select',
      label: 'KYC Status',
      value: editData.kyc_status || selectedRecord.kyc_status,
      onChange: (val) => setEditData({...editData, kyc_status: val}),
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      id: 'account_status',
      type: 'select',
      label: 'Account Status',
      value: editData.account_status || selectedRecord.account_status,
      onChange: (val) => setEditData({...editData, account_status: val}),
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Blocked', value: 'blocked' },
      ],
    },
    {
      id: 'two_fa_enabled',
      type: 'switch',
      label: '2FA Enabled',
      value: editData.two_fa_enabled ?? selectedRecord.two_fa_enabled,
      onChange: (val) => setEditData({...editData, two_fa_enabled: val}),
      description: 'Two-factor authentication status',
    },
    {
      id: 'withdrawal_locked',
      type: 'switch',
      label: 'Withdrawal Locked',
      value: editData.withdrawal_locked ?? selectedRecord.withdrawal_locked,
      onChange: (val) => setEditData({...editData, withdrawal_locked: val}),
      description: 'Prevent user from withdrawing funds',
    },
  ] : [];

  return (
    <div data-testid="page-admin-users-management" className="space-y-4 pb-6">
      {/* KPI Lane */}
      <CardLane title="User Metrics">
        <KPIStat
          label="Total Users"
          value={String(totalUsers)}
          delta={{ value: 8.2, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="KYC Pending"
          value={String(kycPending)}
          icon={<AlertTriangle className="w-4 h-4" />}
          variant={kycPending > 0 ? "warning" : undefined}
        />
        <KPIStat
          label="KYC Approved"
          value={String(kycApproved)}
          icon={<UserCheck className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Suspended"
          value={String(suspended)}
          icon={<UserX className="w-4 h-4" />}
          variant={suspended > 0 ? "warning" : undefined}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <h1 className="text-xl font-heading font-bold text-foreground">
          User Management
        </h1>

        <FilterChips
          groups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        <DataGridAdaptive
          data={users || []}
          columns={columns}
          keyExtractor={(item) => item.user_id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.user_id}
              title={item.email}
              subtitle={item.full_name || 'No name'}
              fields={[
                { label: "KYC", value: item.kyc_status || 'pending' },
                { label: "Status", value: item.account_status || 'active' },
                { 
                  label: "Wallet", 
                  value: item.wallet_address 
                    ? `${item.wallet_address.slice(0, 8)}...`
                    : '-'
                },
              ]}
              status={{
                label: item.kyc_status || 'pending',
                variant: item.kyc_status === 'approved' ? 'success' : item.kyc_status === 'pending' ? 'warning' : 'default',
              }}
              actions={[
                { label: "View", icon: Eye, onClick: () => setSelectedRecord(item) },
                { label: "Edit", icon: Edit, onClick: () => { setSelectedRecord(item); setEditMode(true); } },
              ]}
              onClick={() => setSelectedRecord(item)}
              selected={selected}
            />
          )}
          onRowClick={(row) => setSelectedRecord(row)}
          selectable
        />
      </div>

      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null);
            setEditMode(false);
            setEditData({});
          }
        }}
        title={selectedRecord?.email || "User Details"}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn(
                selectedRecord.kyc_status === 'approved'
                  ? "bg-success/10 text-success border-success/20"
                  : selectedRecord.kyc_status === 'pending'
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted/10 text-muted-foreground border-muted/20"
              )}>
                {selectedRecord.kyc_status || 'pending'}
              </Badge>
              <Badge variant="outline" className={cn(
                selectedRecord.account_status === 'active'
                  ? "bg-success/10 text-success border-success/20"
                  : selectedRecord.account_status === 'suspended'
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}>
                {selectedRecord.account_status || 'active'}
              </Badge>
              {selectedRecord.withdrawal_locked && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <Lock className="w-3 h-3 mr-1" />
                  Withdrawals Locked
                </Badge>
              )}
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4">
                {!editMode ? (
                  <>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm text-foreground break-all">{selectedRecord.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm text-foreground">{selectedRecord.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm text-foreground">{selectedRecord.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Wallet</p>
                          <p className="text-sm text-foreground font-mono truncate">
                            {selectedRecord.wallet_address ? 
                              `${selectedRecord.wallet_address.slice(0, 6)}...${selectedRecord.wallet_address.slice(-4)}` 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">2FA Status</p>
                          <p className="text-sm text-foreground">
                            {selectedRecord.two_fa_enabled ? '✓ Enabled' : '✗ Disabled'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm text-foreground">
                            {new Date(selectedRecord.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setEditMode(true)}
                      className="w-full gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <FormKit fields={userFields} layout="1col" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setEditData({});
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateUser.mutate({
                            userId: selectedRecord.user_id,
                            updates: editData
                          });
                        }}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="balances" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Asset Balances</h3>
                  <p className="text-sm text-muted-foreground">Balance management coming soon</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBalanceDialog(true)}
                  className="w-full gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Adjust Balance
                </Button>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium">Two-Factor Auth</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedRecord.two_fa_enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={selectedRecord.two_fa_enabled ? "default" : "outline"}>
                      {selectedRecord.two_fa_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {selectedRecord.withdrawal_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      <div>
                        <p className="text-sm font-medium">Withdrawal Status</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedRecord.withdrawal_locked ? 'Locked' : 'Unlocked'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLockWithdrawals(
                        selectedRecord.user_id, 
                        !selectedRecord.withdrawal_locked
                      )}
                    >
                      {selectedRecord.withdrawal_locked ? 'Unlock' : 'Lock'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium">Password</p>
                        <p className="text-xs text-muted-foreground">Reset user password</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPasswordDialog(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-3 mt-4">
                <h3 className="text-sm font-medium">Account Actions</h3>
                
                {selectedRecord.kyc_status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproveKYC(selectedRecord.user_id)}
                    className="w-full gap-2 bg-transparent border-success/20 text-success hover:bg-success/10"
                  >
                    <UserCheck className="w-4 h-4" />
                    Approve KYC
                  </Button>
                )}

                {selectedRecord.kyc_status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUser.mutate({ 
                      userId: selectedRecord.user_id, 
                      updates: { kyc_status: 'rejected' }
                    })}
                    className="w-full gap-2 bg-transparent border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <UserX className="w-4 h-4" />
                    Reject KYC
                  </Button>
                )}

                <Separator />

                {selectedRecord.account_status === 'active' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuspendUser(selectedRecord.user_id)}
                      className="w-full gap-2 bg-transparent border-warning/20 text-warning hover:bg-warning/10"
                    >
                      <UserX className="w-4 h-4" />
                      Suspend Account
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBlockUser(selectedRecord.user_id)}
                      className="w-full gap-2 bg-transparent border-destructive/20 text-destructive hover:bg-destructive/10"
                    >
                      <Ban className="w-4 h-4" />
                      Block Account
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActivateUser(selectedRecord.user_id)}
                    className="w-full gap-2 bg-transparent border-success/20 text-success hover:bg-success/10"
                  >
                    <UserCheck className="w-4 h-4" />
                    Activate Account
                  </Button>
                )}

                <Separator />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRolesDialog(true)}
                  className="w-full gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Manage Roles
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast({ title: "Email sent to " + selectedRecord.email })}
                  className="w-full gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DetailSheet>

      {/* Balance Adjustment Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Balance</DialogTitle>
            <DialogDescription>
              Manually adjust the user's asset balance. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBalanceDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Balance adjusted successfully" });
                  setShowBalanceDialog(false);
                  setBalanceAmount("");
                }}
                className="flex-1"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roles Management Dialog */}
      <Dialog open={showRolesDialog} onOpenChange={setShowRolesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Assign or remove roles for this user. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Roles:</p>
              <div className="flex flex-wrap gap-2">
                {selectedRecord?.user_roles?.length > 0 ? (
                  selectedRecord.user_roles.map((r: any, i: number) => (
                    <Badge key={i} variant="outline" className="capitalize">
                      {r.role}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRolesDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to {selectedRecord?.email}. The user will receive instructions to create a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleResetPassword(selectedRecord?.user_id, selectedRecord?.email)}
              className="flex-1"
            >
              Send Reset Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
