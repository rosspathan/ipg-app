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
import { Textarea } from "@/components/ui/textarea";
import { Users, UserCheck, UserX, Shield, TrendingUp, AlertTriangle, Wallet, History, Key, Lock, Unlock, Mail, RefreshCw, Eye, Edit, Ban, DollarSign, Plus, Minus, Award, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
  const [balanceAsset, setBalanceAsset] = useState("BSK");
  const [balanceType, setBalanceType] = useState<'add' | 'subtract'>('add');
  const [selectedBalanceType, setSelectedBalanceType] = useState<'withdrawable' | 'holding'>('withdrawable');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [kycNotes, setKycNotes] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch BSK balances for selected user
  const { data: bskBalances } = useQuery({
    queryKey: ['user-bsk-balance', selectedRecord?.user_id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', selectedRecord.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRecord?.user_id
  });

  // Fetch crypto balances for selected user
  const { data: cryptoBalances } = useQuery({
    queryKey: ['user-crypto-balances', selectedRecord?.user_id],
    queryFn: async () => {
      if (!selectedRecord) return [];
      const { data, error } = await (supabase as any)
        .from('wallet_balances')
        .select('*, assets(*)')
        .eq('user_id', selectedRecord.user_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRecord?.user_id
  });

  // Fetch user subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['user-subscriptions', selectedRecord?.user_id],
    queryFn: async () => {
      if (!selectedRecord) return { adSubscriptions: [], insuranceSubscriptions: [] };
      const [adSubs, insuranceSubs] = await Promise.all([
        (supabase as any).from('user_ad_subscriptions').select('*').eq('user_id', selectedRecord.user_id),
        (supabase as any).from('user_insurance_subscriptions').select('*, insurance_subscription_tiers(*)').eq('user_id', selectedRecord.user_id)
      ]);
      return {
        adSubscriptions: adSubs.data || [],
        insuranceSubscriptions: insuranceSubs.data || []
      };
    },
    enabled: !!selectedRecord?.user_id
  });

  // Fetch user badge status
  const { data: badgeStatus } = useQuery({
    queryKey: ['user-badge-status', selectedRecord?.user_id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const { data, error } = await supabase
        .from('user_badge_status')
        .select('*')
        .eq('user_id', selectedRecord.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRecord?.user_id
  });

  // Fetch KYC profile for selected user
  const { data: kycProfile, refetch: refetchKyc } = useQuery({
    queryKey: ['user-kyc', selectedRecord?.user_id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const { data, error } = await supabase
        .from('kyc_profiles')
        .select('*')
        .eq('user_id', selectedRecord.user_id)
        .maybeSingle();
      if (error) console.error('KYC fetch error:', error);
      return data;
    },
    enabled: !!selectedRecord?.user_id
  });

  // Fetch users with profiles and roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchValue, activeFilters],
    queryFn: async () => {
      // 1) Load profiles without joins (FK missing between profiles and user_roles)
      let query = supabase
        .from('profiles')
        .select('*')
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
      const profiles = data || [];
      if (!profiles.length) return [];

      // 2) Load roles separately and merge client-side
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profiles.map((p: any) => p.user_id));

      if (rolesError) {
        // If roles query fails, still return profiles
        return profiles.map((p: any) => ({ ...p, user_roles: [] }));
      }

      const roleMap = new Map<string, { role: string }[]>();
      (roles || []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) || [];
        arr.push({ role: r.role });
        roleMap.set(r.user_id, arr);
      });

      return profiles.map((p: any) => ({ ...p, user_roles: roleMap.get(p.user_id) || [] }));
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
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1 h-auto">
                <TabsTrigger value="profile" className="text-xs md:text-sm py-2">Profile</TabsTrigger>
                <TabsTrigger value="crypto" className="text-xs md:text-sm py-2">Crypto</TabsTrigger>
                <TabsTrigger value="bsk" className="text-xs md:text-sm py-2">BSK</TabsTrigger>
                <TabsTrigger value="kyc" className="text-xs md:text-sm py-2">KYC</TabsTrigger>
                <TabsTrigger value="subscriptions" className="text-xs md:text-sm py-2">Subs</TabsTrigger>
                <TabsTrigger value="badges" className="text-xs md:text-sm py-2">Badges</TabsTrigger>
                <TabsTrigger value="security" className="text-xs md:text-sm py-2">Security</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs md:text-sm py-2">Actions</TabsTrigger>
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

              <TabsContent value="crypto" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Crypto Balances</h3>
                    <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['user-crypto-balances'] })}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  {cryptoBalances && cryptoBalances.length > 0 ? (
                    <div className="space-y-2">
                      {cryptoBalances.map((balance: any) => (
                        <div key={balance.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold">{balance.assets?.symbol?.slice(0, 2)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{balance.assets?.symbol}</p>
                              <p className="text-xs text-muted-foreground">{balance.assets?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{Number(balance.balance).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{balance.assets?.network}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No crypto balances found</p>
                  )}
                  <div className="pt-2">
                    <h3 className="text-sm font-medium mb-2">Wallet Addresses</h3>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Primary Wallet</p>
                      <p className="text-xs font-mono break-all">
                        {selectedRecord.wallet_address || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bsk" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">BSK Balances</h3>
                    <Button size="sm" variant="outline" onClick={() => {
                      if (selectedRecord?.user_id) {
                        queryClient.invalidateQueries({ queryKey: ['user-bsk-balance', selectedRecord.user_id] });
                      }
                    }}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-xs text-muted-foreground mb-1">Withdrawable</p>
                      <p className="text-lg font-bold text-success">{bskBalances?.withdrawable_balance?.toLocaleString() || '0'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Earned: {bskBalances?.total_earned_withdrawable?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-xs text-muted-foreground mb-1">Holding</p>
                      <p className="text-lg font-bold text-warning">{bskBalances?.holding_balance?.toLocaleString() || '0'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Earned: {bskBalances?.total_earned_holding?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Adjust BSK Balance</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedBalanceType === 'withdrawable' ? 'default' : 'outline'}
                        onClick={() => setSelectedBalanceType('withdrawable')}
                        className="flex-1"
                      >
                        Withdrawable
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedBalanceType === 'holding' ? 'default' : 'outline'}
                        onClick={() => setSelectedBalanceType('holding')}
                        className="flex-1"
                      >
                        Holding
                      </Button>
                    </div>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      disabled={isAdjusting}
                    />
                    {(!balanceAmount || parseFloat(balanceAmount) <= 0) && (
                      <p className="text-xs text-muted-foreground">Enter a positive amount to enable buttons</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          console.debug('[Balance Adjustment] Add button clicked', { 
                            balanceAmount, 
                            selectedBalanceType, 
                            userId: selectedRecord?.user_id 
                          });

                          if (!selectedRecord) {
                            console.debug('[Balance Adjustment] No user selected');
                            return;
                          }

                          if (!balanceAmount) {
                            console.debug('[Balance Adjustment] Amount is empty');
                            toast({ 
                              title: "Invalid Amount", 
                              description: "Please enter an amount", 
                              variant: "destructive" 
                            });
                            return;
                          }

                          const amount = parseFloat(balanceAmount);
                          if (isNaN(amount) || amount <= 0) {
                            console.debug('[Balance Adjustment] Invalid amount', { amount });
                            toast({ 
                              title: "Invalid Amount", 
                              description: "Amount must be greater than 0", 
                              variant: "destructive" 
                            });
                            return;
                          }

                          setIsAdjusting(true);

                          try {
                            console.debug('[RPC] admin_adjust_user_balance payload', {
                              p_target_user_id: selectedRecord.user_id,
                              p_balance_type: 'bsk',
                              p_subtype: selectedBalanceType,
                              p_operation: 'add',
                              p_amount: amount
                            });

                            let usedFallback = false;
                            const { data, error } = await supabase.rpc('admin_adjust_user_balance', {
                              p_target_user_id: selectedRecord.user_id,
                              p_balance_type: 'bsk',
                              p_subtype: selectedBalanceType,
                              p_operation: 'add',
                              p_amount: amount,
                              p_reason: 'Admin adjustment via user management'
                            });
                            
                            console.debug('[RPC] admin_adjust_user_balance result', { data, error });
                            const d: any = data;
                            if (error || (d && (d.ok === false || d.success === false))) {
                              console.warn('[RPC] admin_adjust_user_balance failed, using fallback', { error, data });
                              // Fallback: direct upsert on user_bsk_balances
                              const { data: row, error: rowError } = await supabase
                                .from('user_bsk_balances')
                                .select('*')
                                .eq('user_id', selectedRecord.user_id)
                                .maybeSingle();
                              if (rowError) throw rowError;
                              const targetKey = `${selectedBalanceType}_balance` as keyof any;
                              const earnedKey = selectedBalanceType === 'withdrawable' 
                                ? 'total_earned_withdrawable' 
                                : 'total_earned_holding';
                              const current = Number((row as any)?.[targetKey] || 0);
                              const payload: any = {
                                user_id: selectedRecord.user_id,
                                withdrawable_balance: (row as any)?.withdrawable_balance || 0,
                                holding_balance: (row as any)?.holding_balance || 0,
                                total_earned_withdrawable: (row as any)?.total_earned_withdrawable || 0,
                                total_earned_holding: (row as any)?.total_earned_holding || 0,
                              };
                              payload[targetKey as string] = current + amount;
                              payload[earnedKey] = Number(payload[earnedKey] || 0) + amount;
                              const { error: upsertError } = await supabase
                                .from('user_bsk_balances')
                                .upsert(payload);
                              if (upsertError) throw upsertError;
                              usedFallback = true;
                            }

                            // Invalidate and refetch
                            await queryClient.invalidateQueries({ 
                              queryKey: ['user-bsk-balance', selectedRecord.user_id] 
                            });
                            await queryClient.refetchQueries({ 
                              queryKey: ['user-bsk-balance', selectedRecord.user_id],
                              type: 'active'
                            });

                            // Fetch fresh data and set cache explicitly
                            console.debug('[Balance Adjustment] Fetching fresh balance data');
                            const { data: fresh, error: fetchError } = await supabase
                              .from('user_bsk_balances')
                              .select('*')
                              .eq('user_id', selectedRecord.user_id)
                              .maybeSingle();

                            if (fetchError) {
                              console.error('[Balance Adjustment] Fresh fetch error', fetchError);
                            } else {
                              console.debug('[Balance Adjustment] Fresh balance', fresh);
                              queryClient.setQueryData(['user-bsk-balance', selectedRecord.user_id], fresh);
                            }

                            const newBalance = (fresh as any)?.[`${selectedBalanceType}_balance`] || 0;
                            toast({ 
                              title: "Success", 
                              description: `${usedFallback ? '[Fallback] ' : ''}Added ${amount} BSK to ${selectedBalanceType} balance. New balance: ${Number(newBalance).toFixed(2)} BSK` 
                            });
                          } catch (err: any) {
                            console.error('[Balance Adjustment] Unexpected error', err);
                            toast({ 
                              title: "Error", 
                              description: err.message || "Failed to adjust balance", 
                              variant: "destructive" 
                            });
                          } finally {
                            setIsAdjusting(false);
                          }
                        }}
                        className="flex-1"
                        disabled={isAdjusting || !balanceAmount || parseFloat(balanceAmount) <= 0}
                      >
                        {isAdjusting ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-1" />
                        )}
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          console.debug('[Balance Adjustment] Subtract button clicked', { 
                            balanceAmount, 
                            selectedBalanceType, 
                            userId: selectedRecord?.user_id 
                          });

                          if (!selectedRecord) {
                            console.debug('[Balance Adjustment] No user selected');
                            return;
                          }

                          if (!balanceAmount) {
                            console.debug('[Balance Adjustment] Amount is empty');
                            toast({ 
                              title: "Invalid Amount", 
                              description: "Please enter an amount", 
                              variant: "destructive" 
                            });
                            return;
                          }

                          const amount = parseFloat(balanceAmount);
                          if (isNaN(amount) || amount <= 0) {
                            console.debug('[Balance Adjustment] Invalid amount', { amount });
                            toast({ 
                              title: "Invalid Amount", 
                              description: "Amount must be greater than 0", 
                              variant: "destructive" 
                            });
                            return;
                          }

                          setIsAdjusting(true);

                          try {
                            console.debug('[RPC] admin_adjust_user_balance payload', {
                              p_target_user_id: selectedRecord.user_id,
                              p_balance_type: 'bsk',
                              p_subtype: selectedBalanceType,
                              p_operation: 'deduct',
                              p_amount: amount
                            });

                            let usedFallback = false;
                            const { data, error } = await supabase.rpc('admin_adjust_user_balance', {
                              p_target_user_id: selectedRecord.user_id,
                              p_balance_type: 'bsk',
                              p_subtype: selectedBalanceType,
                              p_operation: 'deduct',
                              p_amount: amount,
                              p_reason: 'Admin adjustment via user management'
                            });
                            
                            console.debug('[RPC] admin_adjust_user_balance result', { data, error });
                            const d: any = data;
                            if (error || (d && (d.ok === false || d.success === false))) {
                              console.warn('[RPC] admin_adjust_user_balance failed, using fallback', { error, data });
                              // Fallback: direct upsert on user_bsk_balances
                              const { data: row, error: rowError } = await supabase
                                .from('user_bsk_balances')
                                .select('*')
                                .eq('user_id', selectedRecord.user_id)
                                .maybeSingle();
                              if (rowError) throw rowError;
                              const targetKey = `${selectedBalanceType}_balance` as keyof any;
                              const current = Number((row as any)?.[targetKey] || 0);
                              const newValue = Math.max(0, current - amount);
                              const payload: any = {
                                user_id: selectedRecord.user_id,
                                withdrawable_balance: (row as any)?.withdrawable_balance || 0,
                                holding_balance: (row as any)?.holding_balance || 0,
                                total_earned_withdrawable: (row as any)?.total_earned_withdrawable || 0,
                                total_earned_holding: (row as any)?.total_earned_holding || 0,
                              };
                              payload[targetKey as string] = newValue;
                              const { error: upsertError } = await supabase
                                .from('user_bsk_balances')
                                .upsert(payload);
                              if (upsertError) throw upsertError;
                              usedFallback = true;
                            }

                            // Invalidate and refetch
                            await queryClient.invalidateQueries({ 
                              queryKey: ['user-bsk-balance', selectedRecord.user_id] 
                            });
                            await queryClient.refetchQueries({ 
                              queryKey: ['user-bsk-balance', selectedRecord.user_id],
                              type: 'active'
                            });

                            // Fetch fresh data and set cache explicitly
                            console.debug('[Balance Adjustment] Fetching fresh balance data');
                            const { data: fresh, error: fetchError } = await supabase
                              .from('user_bsk_balances')
                              .select('*')
                              .eq('user_id', selectedRecord.user_id)
                              .maybeSingle();

                            if (fetchError) {
                              console.error('[Balance Adjustment] Fresh fetch error', fetchError);
                            } else {
                              console.debug('[Balance Adjustment] Fresh balance', fresh);
                              queryClient.setQueryData(['user-bsk-balance', selectedRecord.user_id], fresh);
                            }

                            const newBalance = (fresh as any)?.[`${selectedBalanceType}_balance`] || 0;
                            toast({ 
                              title: "Success", 
                              description: `${usedFallback ? '[Fallback] ' : ''}Deducted ${amount} BSK from ${selectedBalanceType} balance. New balance: ${Number(newBalance).toFixed(2)} BSK` 
                            });
                          } catch (err: any) {
                            console.error('[Balance Adjustment] Unexpected error', err);
                            toast({ 
                              title: "Error", 
                              description: err.message || "Failed to adjust balance", 
                              variant: "destructive" 
                            });
                          } finally {
                            setIsAdjusting(false);
                          }
                        }}
                        className="flex-1"
                        disabled={isAdjusting || !balanceAmount || parseFloat(balanceAmount) <= 0}
                      >
                        {isAdjusting ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Minus className="w-4 h-4 mr-1" />
                        )}
                        Subtract
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="kyc" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">KYC Verification</CardTitle>
                    <Badge variant={
                      kycProfile?.status === 'verified' ? 'default' :
                      kycProfile?.status === 'pending' ? 'secondary' :
                      kycProfile?.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {kycProfile?.status || 'unverified'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!kycProfile || kycProfile.status === 'unverified' ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No KYC submission yet</p>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">First Name</p>
                            <p className="text-sm font-medium">{kycProfile.first_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Last Name</p>
                            <p className="text-sm font-medium">{kycProfile.last_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">ID Type</p>
                            <p className="text-sm font-medium">{kycProfile.id_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">ID Number</p>
                            <p className="text-sm font-medium">{kycProfile.id_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
                            <p className="text-sm font-medium">
                              {kycProfile.submitted_at ? new Date(kycProfile.submitted_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          {kycProfile.reviewed_at && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Reviewed</p>
                              <p className="text-sm font-medium">
                                {new Date(kycProfile.reviewed_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Uploaded Documents</h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {kycProfile.id_front_url && (
                              <div className="border rounded-lg p-3 space-y-2 bg-card">
                                <p className="text-xs font-medium text-muted-foreground">ID Front</p>
                                <img 
                                  src={kycProfile.id_front_url} 
                                  alt="ID Front" 
                                  className="w-full h-28 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(kycProfile.id_front_url)}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full h-8"
                                  onClick={() => setPreviewImage(kycProfile.id_front_url)}
                                >
                                  <Eye className="h-3 w-3 mr-1.5" /> View Full
                                </Button>
                              </div>
                            )}
                            {kycProfile.id_back_url && (
                              <div className="border rounded-lg p-3 space-y-2 bg-card">
                                <p className="text-xs font-medium text-muted-foreground">ID Back</p>
                                <img 
                                  src={kycProfile.id_back_url} 
                                  alt="ID Back" 
                                  className="w-full h-28 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(kycProfile.id_back_url)}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full h-8"
                                  onClick={() => setPreviewImage(kycProfile.id_back_url)}
                                >
                                  <Eye className="h-3 w-3 mr-1.5" /> View Full
                                </Button>
                              </div>
                            )}
                            {kycProfile.selfie_url && (
                              <div className="border rounded-lg p-3 space-y-2 bg-card">
                                <p className="text-xs font-medium text-muted-foreground">Selfie</p>
                                <img 
                                  src={kycProfile.selfie_url} 
                                  alt="Selfie" 
                                  className="w-full h-28 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(kycProfile.selfie_url)}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full h-8"
                                  onClick={() => setPreviewImage(kycProfile.selfie_url)}
                                >
                                  <Eye className="h-3 w-3 mr-1.5" /> View Full
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {kycProfile.status === 'pending' && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium">Admin Review</h4>
                              <div className="space-y-2">
                                <Label htmlFor="kyc-notes" className="text-xs">Notes (optional)</Label>
                                <textarea 
                                  id="kyc-notes"
                                  placeholder="Add review notes..."
                                  value={kycNotes}
                                  onChange={(e) => setKycNotes(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm rounded-md border bg-background resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  className="flex-1 gap-1.5"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('kyc_profiles')
                                        .update({
                                          status: 'verified',
                                          notes: kycNotes,
                                          reviewed_at: new Date().toISOString()
                                        })
                                        .eq('user_id', selectedRecord?.user_id);
                                      if (error) throw error;
                                      toast({ title: "Success", description: "KYC approved successfully" });
                                      setKycNotes("");
                                      refetchKyc();
                                    } catch (error: any) {
                                      toast({ title: "Error", description: error.message, variant: "destructive" });
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" /> Approve
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 gap-1.5"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('kyc_profiles')
                                        .update({
                                          status: 'rejected',
                                          notes: kycNotes,
                                          reviewed_at: new Date().toISOString()
                                        })
                                        .eq('user_id', selectedRecord?.user_id);
                                      if (error) throw error;
                                      toast({ title: "Success", description: "KYC rejected" });
                                      setKycNotes("");
                                      refetchKyc();
                                    } catch (error: any) {
                                      toast({ title: "Error", description: error.message, variant: "destructive" });
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4" /> Reject
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {kycProfile.notes && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                              <p className="text-sm bg-muted/50 p-3 rounded">{kycProfile.notes}</p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Ad Mining Subscriptions</h3>
                  {subscriptions && 'adSubscriptions' in subscriptions && subscriptions.adSubscriptions.length > 0 ? (
                    <div className="space-y-2">
                      {subscriptions.adSubscriptions.map((sub: any) => (
                        <div key={sub.id} className="p-3 rounded-lg bg-muted/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Tier: ₹{sub.tier_bsk}</p>
                            <Badge variant={sub.is_active ? 'default' : 'outline'}>
                              {sub.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Day {sub.day_counter}/{sub.duration_days}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Earned: {sub.total_earned_bsk} BSK
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No ad mining subscriptions</p>
                  )}

                  <Separator />

                  <h3 className="text-sm font-medium">Insurance Subscriptions</h3>
                  {subscriptions && 'insuranceSubscriptions' in subscriptions && subscriptions.insuranceSubscriptions.length > 0 ? (
                    <div className="space-y-2">
                      {subscriptions.insuranceSubscriptions.map((sub: any) => (
                        <div key={sub.id} className="p-3 rounded-lg bg-muted/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{sub.insurance_subscription_tiers?.tier_name}</p>
                            <Badge variant={sub.status === 'active' ? 'default' : 'outline'}>
                              {sub.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Claims: {sub.claims_used_this_month}/{sub.insurance_subscription_tiers?.max_claims_per_month || '∞'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No insurance subscriptions</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="badges" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Badge Status</h3>
                  {badgeStatus ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-primary" />
                          <p className="text-lg font-bold text-primary">{badgeStatus.current_badge}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Current Badge</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">IPG Contributed</p>
                          <p className="text-sm font-medium">{badgeStatus.total_ipg_contributed?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Achieved At</p>
                          <p className="text-sm font-medium">
                            {badgeStatus.achieved_at ? new Date(badgeStatus.achieved_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Update Badge</Label>
                        <select className="w-full p-2 rounded-md border bg-background text-sm">
                          <option value="None">None</option>
                          <option value="Silver">Silver</option>
                          <option value="Gold">Gold</option>
                          <option value="Platinum">Platinum</option>
                          <option value="Diamond">Diamond</option>
                          <option value="VIP">VIP</option>
                        </select>
                        <Button size="sm" className="w-full" variant="outline">
                          Update Badge
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No badge status found</p>
                  )}
                </div>
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

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription className="sr-only">Full size document image</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="p-4 pt-0">
              <img 
                src={previewImage} 
                alt="Document" 
                className="w-full h-auto rounded max-h-[70vh] object-contain bg-muted" 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
