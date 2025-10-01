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
import { Users, UserCheck, UserX, Shield, TrendingUp, AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with profiles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchValue, activeFilters],
    queryFn: async () => {
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
    { key: "email", label: "Email" },
    { key: "full_name", label: "Name" },
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
              : "bg-danger/10 text-danger border-danger/20"
          )}
        >
          {row.account_status || 'active'}
        </Badge>
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
              ]}
              status={{
                label: item.kyc_status || 'pending',
                variant: item.kyc_status === 'approved' ? 'success' : 'default',
              }}
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
        title={selectedRecord?.email}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(
                selectedRecord.kyc_status === 'approved'
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              )}>
                {selectedRecord.kyc_status || 'pending'}
              </Badge>
              <Badge variant="outline" className={cn(
                selectedRecord.account_status === 'active'
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-danger/10 text-danger border-danger/20"
              )}>
                {selectedRecord.account_status || 'active'}
              </Badge>
            </div>

            {!editMode ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">User Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground">{selectedRecord.email}</p>
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
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Edit User
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRecord.kyc_status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveKYC(selectedRecord.user_id)}
                        className="gap-2 bg-transparent border-success/20 text-success"
                      >
                        <UserCheck className="w-4 h-4" />
                        Approve KYC
                      </Button>
                    )}
                    {selectedRecord.account_status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendUser(selectedRecord.user_id)}
                        className="gap-2 bg-transparent border-warning/20 text-warning"
                      >
                        <UserX className="w-4 h-4" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateUser(selectedRecord.user_id)}
                        className="gap-2 bg-transparent border-success/20 text-success"
                      >
                        <UserCheck className="w-4 h-4" />
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
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
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
