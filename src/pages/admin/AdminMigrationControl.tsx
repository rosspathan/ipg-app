import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Shield, Search,
  ChevronDown, ChevronUp, Eye, Loader2, RefreshCw
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface MigrationDetail {
  id: string;
  user_id: string;
  username: string;
  email: string;
  wallet_address: string;
  amount_requested: number;
  migration_fee_bsk: number;
  migration_fee_percent: number;
  gas_deduction_bsk: number;
  net_amount_migrated: number;
  internal_balance_snapshot: number;
  ledger_sum_at_snapshot: number;
  balance_matches_ledger: boolean;
  current_withdrawable_balance: number;
  current_holding_balance: number;
  current_ledger_sum: number;
  balance_matches_ledger_now: boolean;
  total_lifetime_migrated: number;
  daily_migration_total: number;
  last_login_ip: string | null;
  account_created_at: string;
  account_status: string;
  kyc_status: string;
  suspicious_activity_flags: string[];
  recent_ledger_entries: any[];
  status: string;
  tx_hash: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  admin_approval_note: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  block_number: number | null;
}

// ============================================
// Status badges
// ============================================
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending_admin_approval: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: <Clock className="h-3 w-3" />, label: 'Pending Approval' },
    approved_executing: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Executing' },
    completed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
    rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' },
    failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <AlertTriangle className="h-3 w-3" />, label: 'Failed' },
    rolled_back: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <RefreshCw className="h-3 w-3" />, label: 'Rolled Back' },
  };

  const c = config[status] || { color: 'bg-muted text-muted-foreground', icon: null, label: status };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

// ============================================
// Main Component
// ============================================
const AdminMigrationControl = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('pending');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch pending migrations via edge function
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['admin-pending-migrations'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-migration-control', {
        body: { action: 'get_pending' }
      });
      if (error) throw error;
      return data?.pending as MigrationDetail[] || [];
    },
    refetchInterval: 15000,
  });

  // Fetch all migrations for history
  const { data: allMigrations, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-migration-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, admin_approval_note')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['migration-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_migration_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ migrationId, adminNote }: { migrationId: string; adminNote?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-migration-control', {
        body: { action: 'approve', migration_id: migrationId, admin_note: adminNote }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Migration approved and completed. TX: ${data.tx_hash?.slice(0, 10)}...`);
      queryClient.invalidateQueries({ queryKey: ['admin-pending-migrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-migration-history'] });
    },
    onError: (error: any) => {
      toast.error(`Approval failed: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ migrationId, rejectionReason, adminNote }: { migrationId: string; rejectionReason: string; adminNote?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-migration-control', {
        body: { action: 'reject', migration_id: migrationId, rejection_reason: rejectionReason, admin_note: adminNote }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Migration rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-migrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-migration-history'] });
    },
    onError: (error: any) => {
      toast.error(`Rejection failed: ${error.message}`);
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!settings?.id) throw new Error('Settings not loaded');
      const { error } = await supabase
        .from('bsk_migration_settings')
        .update(updates)
        .eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['migration-settings'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleApprove = (migrationId: string) => {
    if (!confirm('Are you sure you want to approve and execute this migration? This will debit the user and broadcast the on-chain transaction.')) return;
    approveMutation.mutate({ migrationId, adminNote: adminNotes[migrationId] });
  };

  const handleReject = (migrationId: string) => {
    const reason = rejectReasons[migrationId];
    if (!reason?.trim()) {
      toast.error('Rejection reason is mandatory');
      return;
    }
    rejectMutation.mutate({ migrationId, rejectionReason: reason, adminNote: adminNotes[migrationId] });
  };

  // Filter history
  const filteredHistory = (allMigrations || []).filter((m: any) => {
    if (historyFilter !== 'all' && m.status !== historyFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        m.user_id?.toLowerCase().includes(term) ||
        m.wallet_address?.toLowerCase().includes(term) ||
        m.tx_hash?.toLowerCase().includes(term) ||
        m.id?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const pendingCount = pendingData?.length || 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Migration Control Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin-approval based BSK on-chain migration engine
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchPending()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* State Machine Diagram */}
      <Card className="p-4 bg-muted/30 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">State Machine</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status="pending_admin_approval" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge status="approved_executing" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge status="completed" />
          <span className="text-muted-foreground mx-2">|</span>
          <StatusBadge status="rejected" />
          <span className="text-muted-foreground mx-2">|</span>
          <StatusBadge status="failed" />
          <span className="text-muted-foreground mx-2">|</span>
          <StatusBadge status="rolled_back" />
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval {pendingCount > 0 && <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">Migration History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ======================== PENDING TAB ======================== */}
        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : pendingCount === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              No pending migration requests
            </Card>
          ) : (
            (pendingData || []).map((m) => (
              <Card key={m.id} className="border-border overflow-hidden">
                {/* Summary row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{m.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{Number(m.amount_requested).toLocaleString()} BSK</p>
                      <p className="text-xs text-muted-foreground">to {m.wallet_address?.slice(0, 8)}...{m.wallet_address?.slice(-6)}</p>
                    </div>
                    <StatusBadge status={m.status} />
                    {m.suspicious_activity_flags?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> {m.suspicious_activity_flags.length} flag(s)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'MMM dd, HH:mm')}</span>
                    {expandedId === m.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === m.id && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                    {/* Suspicious flags */}
                    {m.suspicious_activity_flags?.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
                        <p className="text-sm font-semibold text-amber-400 flex items-center gap-1 mb-1">
                          <AlertTriangle className="h-4 w-4" /> Suspicious Activity Flags
                        </p>
                        <ul className="text-xs text-amber-300 list-disc list-inside">
                          {m.suspicious_activity_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* User & Balance Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <InfoCell label="User ID" value={m.user_id?.slice(0, 8) + '...'} />
                      <InfoCell label="Account Status" value={m.account_status || 'N/A'} />
                      <InfoCell label="KYC Status" value={m.kyc_status || 'N/A'} />
                      <InfoCell label="Account Created" value={m.account_created_at ? format(new Date(m.account_created_at), 'MMM dd, yyyy') : 'N/A'} />
                      <InfoCell label="Withdrawable Balance" value={`${Number(m.current_withdrawable_balance).toLocaleString()} BSK`} />
                      <InfoCell label="Holding Balance" value={`${Number(m.current_holding_balance).toLocaleString()} BSK`} />
                      <InfoCell label="Ledger Sum (now)" value={`${Number(m.current_ledger_sum).toLocaleString()} BSK`} />
                      <InfoCell label="Balance ↔ Ledger" value={m.balance_matches_ledger_now ? '✅ Match' : '❌ Mismatch'} highlight={!m.balance_matches_ledger_now} />
                      <InfoCell label="Snapshot Balance" value={`${Number(m.internal_balance_snapshot).toLocaleString()} BSK`} />
                      <InfoCell label="Snapshot Ledger" value={`${Number(m.ledger_sum_at_snapshot || 0).toLocaleString()} BSK`} />
                      <InfoCell label="Lifetime Migrated" value={`${Number(m.total_lifetime_migrated).toLocaleString()} BSK`} />
                      <InfoCell label="Today's Total" value={`${Number(m.daily_migration_total).toLocaleString()} BSK`} />
                      <InfoCell label="Fee" value={`${m.migration_fee_percent}% = ${Number(m.migration_fee_bsk).toLocaleString()} BSK`} />
                      <InfoCell label="Gas Deduction" value={`${Number(m.gas_deduction_bsk).toLocaleString()} BSK`} />
                      <InfoCell label="Net Amount" value={`${(Number(m.amount_requested) - Number(m.migration_fee_bsk) - Number(m.gas_deduction_bsk)).toLocaleString()} BSK`} />
                      <InfoCell label="Last Login IP" value={m.last_login_ip || 'N/A'} />
                    </div>

                    {/* Recent Ledger Entries */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Last 20 Ledger Entries</p>
                      <div className="max-h-48 overflow-auto rounded border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Subtype</TableHead>
                              <TableHead className="text-xs">Amount</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(m.recent_ledger_entries || []).map((e: any) => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs">{e.tx_type}</TableCell>
                                <TableCell className="text-xs">{e.tx_subtype || '-'}</TableCell>
                                <TableCell className="text-xs font-mono">{Number(e.amount_bsk).toLocaleString()}</TableCell>
                                <TableCell className="text-xs">{e.status}</TableCell>
                                <TableCell className="text-xs">{format(new Date(e.created_at), 'MM/dd HH:mm')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Admin Note (optional)</label>
                        <Input
                          placeholder="Internal note..."
                          value={adminNotes[m.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rejection Reason (required if rejecting)</label>
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={rejectReasons[m.id] || ''}
                          onChange={(e) => setRejectReasons(prev => ({ ...prev, [m.id]: e.target.value }))}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="success"
                          onClick={() => handleApprove(m.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Approve & Execute
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(m.id)}
                          disabled={rejectMutation.isPending}
                          className="flex-1"
                        >
                          {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ======================== HISTORY TAB ======================== */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user ID, wallet, tx hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending_admin_approval">Pending</option>
              <option value="approved_executing">Executing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Fee</TableHead>
                    <TableHead className="text-xs">Net</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">TX Hash</TableHead>
                    <TableHead className="text-xs">Rejection</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Approved/Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-mono">{m.id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs font-mono">{m.user_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs font-mono">{Number(m.amount_requested).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">{m.migration_fee_percent || 5}%</TableCell>
                      <TableCell className="text-xs font-mono">{Number(m.net_amount_migrated || 0).toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-xs font-mono">
                        {m.tx_hash ? (
                          <a href={`https://bscscan.com/tx/${m.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {m.tx_hash.slice(0, 10)}...
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{m.rejection_reason || '-'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(m.created_at), 'MM/dd HH:mm')}</TableCell>
                      <TableCell className="text-xs">
                        {m.approved_at ? format(new Date(m.approved_at), 'MM/dd HH:mm') : m.rejected_at ? format(new Date(m.rejected_at), 'MM/dd HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No migrations found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ======================== SETTINGS TAB ======================== */}
        <TabsContent value="settings" className="space-y-4">
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : settings ? (
            <SettingsPanel settings={settings} onUpdate={(updates) => updateSettingsMutation.mutate(updates)} saving={updateSettingsMutation.isPending} />
          ) : (
            <p className="text-muted-foreground">No settings found</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================
// Info Cell
// ============================================
const InfoCell = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-md p-2 ${highlight ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/30'}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-medium ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
  </div>
);

// ============================================
// Settings Panel
// ============================================
const SettingsPanel = ({ settings, onUpdate, saving }: { settings: any; onUpdate: (u: Record<string, any>) => void; saving: boolean }) => {
  const [local, setLocal] = useState({
    migration_enabled: settings.migration_enabled,
    maintenance_mode: settings.maintenance_mode,
    maintenance_message: settings.maintenance_message || '',
    migration_fee_percent: settings.migration_fee_percent,
    min_amount_bsk: settings.min_amount_bsk,
    max_amount_bsk: settings.max_amount_bsk || '',
    max_per_request_bsk: settings.max_per_request_bsk || '',
    per_user_daily_limit_bsk: settings.per_user_daily_limit_bsk || '',
  });

  const handleSave = () => {
    onUpdate({
      migration_enabled: local.migration_enabled,
      maintenance_mode: local.maintenance_mode,
      maintenance_message: local.maintenance_message || null,
      migration_fee_percent: Number(local.migration_fee_percent),
      min_amount_bsk: Number(local.min_amount_bsk),
      max_amount_bsk: local.max_amount_bsk ? Number(local.max_amount_bsk) : null,
      max_per_request_bsk: local.max_per_request_bsk ? Number(local.max_per_request_bsk) : null,
      per_user_daily_limit_bsk: local.per_user_daily_limit_bsk ? Number(local.per_user_daily_limit_bsk) : null,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Migration Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
          <span className="text-sm text-foreground">Migration Enabled</span>
          <button
            onClick={() => setLocal(p => ({ ...p, migration_enabled: !p.migration_enabled }))}
            className={`w-12 h-6 rounded-full transition-colors ${local.migration_enabled ? 'bg-emerald-500' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${local.migration_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
          <span className="text-sm text-foreground">Maintenance Mode</span>
          <button
            onClick={() => setLocal(p => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
            className={`w-12 h-6 rounded-full transition-colors ${local.maintenance_mode ? 'bg-amber-500' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${local.maintenance_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <SettingInput label="Maintenance Message" value={local.maintenance_message} onChange={(v) => setLocal(p => ({ ...p, maintenance_message: v }))} />
        <SettingInput label="Fee %" value={local.migration_fee_percent} onChange={(v) => setLocal(p => ({ ...p, migration_fee_percent: v }))} type="number" />
        <SettingInput label="Min Amount (BSK)" value={local.min_amount_bsk} onChange={(v) => setLocal(p => ({ ...p, min_amount_bsk: v }))} type="number" />
        <SettingInput label="Max Amount (BSK)" value={local.max_amount_bsk} onChange={(v) => setLocal(p => ({ ...p, max_amount_bsk: v }))} type="number" placeholder="No limit" />
        <SettingInput label="Max Per Request (BSK)" value={local.max_per_request_bsk} onChange={(v) => setLocal(p => ({ ...p, max_per_request_bsk: v }))} type="number" placeholder="No limit" />
        <SettingInput label="Daily Limit Per User (BSK)" value={local.per_user_daily_limit_bsk} onChange={(v) => setLocal(p => ({ ...p, per_user_daily_limit_bsk: v }))} type="number" placeholder="No limit" />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Save Settings
      </Button>
    </Card>
  );
};

const SettingInput = ({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1"
    />
  </div>
);

export default AdminMigrationControl;
