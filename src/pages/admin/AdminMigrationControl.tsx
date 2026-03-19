import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { useHotWalletStatus } from '@/hooks/useHotWalletStatus';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Shield, Search,
  Eye, Loader2, RefreshCw, Download, Activity, Settings, List,
  User, Wallet, TrendingUp, ArrowRight, ExternalLink
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
// Status Badge - compact
// ============================================
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending_admin_approval: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'PENDING' },
    approved_executing: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'EXECUTING' },
    completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'COMPLETED' },
    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'REJECTED' },
    failed: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'FAILED' },
    rolled_back: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'ROLLED BACK' },
  };
  const c = config[status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: status?.toUpperCase() };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ============================================
// Risk Score
// ============================================
const RiskScore = ({ flags, balanceMatch }: { flags: string[]; balanceMatch: boolean }) => {
  const score = (flags?.length || 0) + (balanceMatch ? 0 : 2);
  const color = score === 0 ? 'text-emerald-400' : score <= 2 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-mono text-xs font-bold ${color}`}>{score}</span>;
};

// ============================================
// Main Component
// ============================================
const AdminMigrationControl = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const hotWallet = useHotWalletStatus();

  // ---- Data Fetching ----
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

  const { data: allMigrations, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-migration-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, admin_approval_note')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

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

  // ---- Mutations ----
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
      toast.success(`Approved. TX: ${data.tx_hash?.slice(0, 12)}...`);
      queryClient.invalidateQueries({ queryKey: ['admin-pending-migrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-migration-history'] });
      setSelectedId(null);
      setAdminNote('');
    },
    onError: (error: any) => toast.error(`Approval failed: ${error.message}`),
  });

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
      toast.success('Migration rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-migrations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-migration-history'] });
      setSelectedId(null);
      setRejectReason('');
      setAdminNote('');
    },
    onError: (error: any) => toast.error(`Rejection failed: ${error.message}`),
  });

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

  // ---- Handlers ----
  const handleApproveConfirm = () => {
    if (!selectedId) return;
    approveMutation.mutate({ migrationId: selectedId, adminNote });
    setConfirmAction(null);
  };

  const handleRejectConfirm = () => {
    if (!selectedId) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    rejectMutation.mutate({ migrationId: selectedId, rejectionReason: rejectReason, adminNote });
    setConfirmAction(null);
  };

  // ---- Derived ----
  const selectedMigration = pendingData?.find(m => m.id === selectedId) || null;
  const pendingCount = pendingData?.length || 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = useMemo(() => {
    const all = allMigrations || [];
    const today = all.filter((m: any) => m.created_at?.slice(0, 10) === todayStr);
    return {
      approved: today.filter((m: any) => m.status === 'completed').length,
      rejected: today.filter((m: any) => m.status === 'rejected').length,
      volume: today.reduce((s: number, m: any) => s + Number(m.amount_requested || 0), 0),
    };
  }, [allMigrations, todayStr]);

  const filteredHistory = useMemo(() => {
    return (allMigrations || []).filter((m: any) => {
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
  }, [allMigrations, historyFilter, searchTerm]);

  // ---- CSV Export ----
  const exportCSV = () => {
    const headers = ['ID', 'User ID', 'Wallet', 'Amount', 'Fee%', 'Fee BSK', 'Net', 'Status', 'TX Hash', 'Rejection Reason', 'Created', 'Approved', 'Completed', 'Failed'];
    const rows = filteredHistory.map((m: any) => [
      m.id, m.user_id, m.wallet_address, m.amount_requested, m.migration_fee_percent || 5,
      m.migration_fee_bsk || 0, m.net_amount_migrated || 0, m.status, m.tx_hash || '',
      m.rejection_reason || '', m.created_at, m.approved_at || '', m.completed_at || '', m.failed_at || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `migrations-${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-0">
      {/* ========== COMPACT HEADER ========== */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(220_13%_14%)]">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-bold text-foreground tracking-tight">MIGRATION CONTROL</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{pendingCount} PENDING</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetchPending()} className="h-7 px-2 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* ========== METRICS BAR ========== */}
      <div className="grid grid-cols-5 border-b border-[hsl(220_13%_14%)]">
        <MetricCell label="Pending" value={pendingCount} icon={<Clock className="h-3 w-3 text-amber-400" />} highlight={pendingCount > 0} />
        <MetricCell label="Approved Today" value={todayStats.approved} icon={<CheckCircle className="h-3 w-3 text-emerald-400" />} />
        <MetricCell label="Rejected Today" value={todayStats.rejected} icon={<XCircle className="h-3 w-3 text-red-400" />} />
        <MetricCell label="Volume Today" value={`${todayStats.volume.toLocaleString()} BSK`} icon={<TrendingUp className="h-3 w-3 text-primary" />} />
        <MetricCell
          label="Hot Wallet"
          value={hotWallet.data ? `${Number(hotWallet.data.bnbBalance).toFixed(4)} BNB` : 'N/A'}
          icon={<Wallet className="h-3 w-3 text-blue-400" />}
          highlight={hotWallet.data?.isLowGas}
        />
      </div>

      {/* ========== TABS ========== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-[hsl(220_13%_14%)] px-3">
          <TabsList className="bg-transparent h-8 p-0 gap-0">
            <TabsTrigger value="pending" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-3 text-xs font-semibold">
              <List className="h-3 w-3 mr-1" /> Pending
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-3 text-xs font-semibold">
              <Activity className="h-3 w-3 mr-1" /> History
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-3 text-xs font-semibold">
              <Settings className="h-3 w-3 mr-1" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ======================== PENDING TAB ======================== */}
        <TabsContent value="pending" className="mt-0">
          {pendingLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle className="h-6 w-6 text-emerald-400 mb-2" />
              <p className="text-xs">No pending requests</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-220px)]">
              {/* LEFT: Request List */}
              <div className="lg:w-[360px] xl:w-[420px] border-r border-[hsl(220_13%_14%)] overflow-y-auto">
                <div className="divide-y divide-[hsl(220_13%_14%)]">
                  {(pendingData || []).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => { setSelectedId(m.id); setRejectReason(''); setAdminNote(''); }}
                      className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-[hsl(220_13%_10%)] ${
                        selectedId === m.id ? 'bg-[hsl(220_13%_10%)] border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{m.username || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), 'MM/dd HH:mm')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-mono text-foreground">{Number(m.amount_requested).toLocaleString()} BSK</span>
                        <RiskScore flags={m.suspicious_activity_flags} balanceMatch={m.balance_matches_ledger_now} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{m.wallet_address?.slice(0, 10)}...{m.wallet_address?.slice(-6)}</span>
                        {m.suspicious_activity_flags?.length > 0 && (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CENTER + RIGHT on mobile: stacked */}
              {selectedMigration ? (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  {/* CENTER: Detail Panel */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <DetailPanel migration={selectedMigration} />
                  </div>

                  {/* RIGHT: Approval Panel - Sticky */}
                  <div className="lg:w-[280px] xl:w-[300px] border-t lg:border-t-0 lg:border-l border-[hsl(220_13%_14%)] bg-[hsl(220_13%_5%)]">
                    <div className="sticky top-0 p-3 space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Action Panel
                      </h3>

                      {/* Summary */}
                      <div className="bg-[hsl(220_13%_8%)] rounded border border-[hsl(220_13%_14%)] p-2 space-y-1">
                        <Row label="Amount" value={`${Number(selectedMigration.amount_requested).toLocaleString()} BSK`} />
                        <Row label="Fee" value={`${selectedMigration.migration_fee_percent}% (${Number(selectedMigration.migration_fee_bsk).toLocaleString()} BSK)`} />
                        <Row label="Net Send" value={`${(Number(selectedMigration.amount_requested) - Number(selectedMigration.migration_fee_bsk) - Number(selectedMigration.gas_deduction_bsk)).toLocaleString()} BSK`} bold />
                        <Row label="To" value={`${selectedMigration.wallet_address?.slice(0, 12)}...`} mono />
                      </div>

                      {/* Admin Note */}
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Admin Note</label>
                        <Input
                          placeholder="Optional note..."
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="mt-1 h-8 text-xs bg-[hsl(220_13%_8%)] border-[hsl(220_13%_14%)]"
                        />
                      </div>

                      {/* Rejection Reason */}
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Rejection Reason</label>
                        <Textarea
                          placeholder="Required for rejection..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="mt-1 text-xs bg-[hsl(220_13%_8%)] border-[hsl(220_13%_14%)] min-h-[60px]"
                          rows={2}
                        />
                      </div>

                      {/* Action Buttons */}
                      <Button
                        onClick={() => setConfirmAction('approve')}
                        disabled={approveMutation.isPending}
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
                      >
                        {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        APPROVE & EXECUTE
                      </Button>
                      <Button
                        onClick={() => {
                          if (!rejectReason.trim()) { toast.error('Enter rejection reason first'); return; }
                          setConfirmAction('reject');
                        }}
                        disabled={rejectMutation.isPending}
                        className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                        REJECT
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Select a request to review</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ======================== HISTORY TAB ======================== */}
        <TabsContent value="history" className="mt-0 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search wallet, TX hash, user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%)]"
              />
            </div>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="h-8 rounded border border-[hsl(220_13%_14%)] bg-[hsl(220_13%_7%)] px-2 text-xs text-foreground"
            >
              <option value="all">All</option>
              <option value="pending_admin_approval">Pending</option>
              <option value="approved_executing">Executing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-8 px-2 text-xs">
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>

          <div className="text-[10px] text-muted-foreground">{filteredHistory.length} records</div>

          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-auto rounded border border-[hsl(220_13%_14%)]">
              {/* Mobile: card layout */}
              <div className="lg:hidden divide-y divide-[hsl(220_13%_14%)]">
                {filteredHistory.map((m: any) => (
                  <HistoryCard key={m.id} m={m} />
                ))}
                {filteredHistory.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">No records</div>
                )}
              </div>

              {/* Desktop: table layout */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[hsl(220_13%_7%)]">
                      {['ID', 'User', 'Wallet', 'Amount', 'Fee', 'Net', 'Status', 'TX Hash', 'Reason', 'Created', 'Resolved'].map(h => (
                        <TableHead key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground h-7 px-2">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((m: any) => (
                      <TableRow key={m.id} className="hover:bg-[hsl(220_13%_10%)]">
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">{m.id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">{m.user_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">{m.wallet_address?.slice(0, 10)}...</TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5 font-bold">{Number(m.amount_requested).toLocaleString()}</TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">{m.migration_fee_percent || 5}%</TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">{Number(m.net_amount_migrated || 0).toLocaleString()}</TableCell>
                        <TableCell className="px-2 py-1.5"><StatusBadge status={m.status} /></TableCell>
                        <TableCell className="text-[10px] font-mono px-2 py-1.5">
                          {m.tx_hash ? (
                            <a href={`https://bscscan.com/tx/${m.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                              {m.tx_hash.slice(0, 8)}… <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-[10px] px-2 py-1.5 max-w-[120px] truncate">{m.rejection_reason || '—'}</TableCell>
                        <TableCell className="text-[10px] px-2 py-1.5 whitespace-nowrap">{format(new Date(m.created_at), 'MM/dd HH:mm')}</TableCell>
                        <TableCell className="text-[10px] px-2 py-1.5 whitespace-nowrap">
                          {m.approved_at ? format(new Date(m.approved_at), 'MM/dd HH:mm') : m.rejected_at ? format(new Date(m.rejected_at), 'MM/dd HH:mm') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredHistory.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-8">No records</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ======================== SETTINGS TAB ======================== */}
        <TabsContent value="settings" className="mt-0 p-3">
          {settingsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : settings ? (
            <SettingsPanel
              settings={settings}
              hotWallet={hotWallet.data}
              onUpdate={(u) => updateSettingsMutation.mutate(u)}
              saving={updateSettingsMutation.isPending}
            />
          ) : (
            <p className="text-xs text-muted-foreground">No settings found</p>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== CONFIRMATION DIALOGS ========== */}
      <AlertDialog open={confirmAction === 'approve'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Approval</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will debit the user's balance and broadcast an on-chain BSK transfer to{' '}
              <span className="font-mono text-foreground">{selectedMigration?.wallet_address?.slice(0, 16)}...</span>
              <br /><br />
              <strong className="text-foreground">Amount:</strong> {Number(selectedMigration?.amount_requested || 0).toLocaleString()} BSK
              <br />
              <strong className="text-foreground">This action is irreversible.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(220_13%_14%)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'reject'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Reject migration for <span className="font-mono text-foreground">{selectedMigration?.username}</span>?
              <br />Reason: <span className="text-foreground">{rejectReason}</span>
              <br /><br />The user's balance will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(220_13%_14%)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============================================
// Metric Cell
// ============================================
const MetricCell = ({ label, value, icon, highlight }: { label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) => (
  <div className={`px-3 py-2 border-r border-[hsl(220_13%_14%)] last:border-r-0 ${highlight ? 'bg-red-500/5' : ''}`}>
    <div className="flex items-center gap-1 mb-0.5">{icon}<span className="text-[10px] text-muted-foreground uppercase">{label}</span></div>
    <span className={`text-sm font-bold font-mono ${highlight ? 'text-red-400' : 'text-foreground'}`}>{value}</span>
  </div>
);

// ============================================
// Row helper
// ============================================
const Row = ({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) => (
  <div className="flex justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className={`text-foreground ${bold ? 'font-bold' : ''} ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

// ============================================
// Detail Panel - Center
// ============================================
const DetailPanel = ({ migration: m }: { migration: MigrationDetail }) => {
  const accountAge = m.account_created_at ? differenceInDays(new Date(), new Date(m.account_created_at)) : 0;

  return (
    <>
      {/* Flags */}
      {m.suspicious_activity_flags?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
          <p className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" /> Flags ({m.suspicious_activity_flags.length})
          </p>
          {m.suspicious_activity_flags.map((f, i) => (
            <p key={i} className="text-[10px] text-amber-300">• {f}</p>
          ))}
        </div>
      )}

      {/* User Profile */}
      <SectionHeader icon={<User className="h-3 w-3" />} title="User Profile" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <DataRow label="Username" value={m.username || 'N/A'} />
        <DataRow label="Email" value={m.email || 'N/A'} />
        <DataRow label="User ID" value={m.user_id?.slice(0, 12) + '...'} mono />
        <DataRow label="Join Date" value={m.account_created_at ? format(new Date(m.account_created_at), 'MMM dd, yyyy') : 'N/A'} />
        <DataRow label="Account Age" value={`${accountAge} days`} />
        <DataRow label="Account Status" value={m.account_status || 'N/A'} />
        <DataRow label="KYC Status" value={m.kyc_status || 'N/A'} status={m.kyc_status === 'verified' ? 'good' : 'warn'} />
        <DataRow label="Last Login IP" value={m.last_login_ip || 'N/A'} mono />
      </div>

      {/* Financial Snapshot */}
      <SectionHeader icon={<TrendingUp className="h-3 w-3" />} title="Financial Snapshot" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <DataRow label="Withdrawable" value={`${Number(m.current_withdrawable_balance).toLocaleString()} BSK`} mono />
        <DataRow label="Holding" value={`${Number(m.current_holding_balance).toLocaleString()} BSK`} mono />
        <DataRow label="Ledger Sum" value={`${Number(m.current_ledger_sum).toLocaleString()} BSK`} mono />
        <DataRow
          label="Balance ↔ Ledger"
          value={m.balance_matches_ledger_now ? 'MATCH' : 'MISMATCH'}
          status={m.balance_matches_ledger_now ? 'good' : 'bad'}
        />
        <DataRow label="Lifetime Migrated" value={`${Number(m.total_lifetime_migrated).toLocaleString()} BSK`} mono />
        <DataRow label="Today Migrated" value={`${Number(m.daily_migration_total).toLocaleString()} BSK`} mono />
        <DataRow label="Snapshot Balance" value={`${Number(m.internal_balance_snapshot).toLocaleString()} BSK`} mono />
        <DataRow label="Snapshot Ledger" value={`${Number(m.ledger_sum_at_snapshot || 0).toLocaleString()} BSK`} mono />
      </div>

      {/* Migration Details */}
      <SectionHeader icon={<ArrowRight className="h-3 w-3" />} title="Migration Request" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <DataRow label="Requested" value={`${Number(m.amount_requested).toLocaleString()} BSK`} mono />
        <DataRow label="Fee" value={`${m.migration_fee_percent}% = ${Number(m.migration_fee_bsk).toLocaleString()} BSK`} mono />
        <DataRow label="Gas Deduction" value={`${Number(m.gas_deduction_bsk).toLocaleString()} BSK`} mono />
        <DataRow label="Net Amount" value={`${(Number(m.amount_requested) - Number(m.migration_fee_bsk) - Number(m.gas_deduction_bsk)).toLocaleString()} BSK`} mono />
        <DataRow label="Wallet" value={`${m.wallet_address?.slice(0, 16)}...${m.wallet_address?.slice(-8)}`} mono />
        <DataRow label="Submitted" value={format(new Date(m.created_at), 'MMM dd, yyyy HH:mm')} />
      </div>

      {/* Recent Ledger */}
      <SectionHeader icon={<Activity className="h-3 w-3" />} title={`Recent Ledger (${m.recent_ledger_entries?.length || 0})`} />
      <div className="max-h-[200px] overflow-auto rounded border border-[hsl(220_13%_14%)]">
        <table className="w-full text-[10px]">
          <thead className="bg-[hsl(220_13%_7%)] sticky top-0">
            <tr>
              {['Type', 'Subtype', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left px-2 py-1 font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220_13%_14%)]">
            {(m.recent_ledger_entries || []).map((e: any) => (
              <tr key={e.id} className="hover:bg-[hsl(220_13%_10%)]">
                <td className="px-2 py-1 font-mono">{e.tx_type}</td>
                <td className="px-2 py-1 text-muted-foreground">{e.tx_subtype || '—'}</td>
                <td className={`px-2 py-1 font-mono font-bold ${Number(e.amount_bsk) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Number(e.amount_bsk).toLocaleString()}
                </td>
                <td className="px-2 py-1">{e.status}</td>
                <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), 'MM/dd HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ============================================
// Section Header
// ============================================
const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-1.5 pt-2 pb-1 border-b border-[hsl(220_13%_14%)]">
    {icon}
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
  </div>
);

// ============================================
// Data Row
// ============================================
const DataRow = ({ label, value, mono, status }: { label: string; value: string; mono?: boolean; status?: 'good' | 'warn' | 'bad' }) => (
  <div className="flex justify-between py-0.5">
    <span className="text-muted-foreground">{label}</span>
    <span className={`text-foreground ${mono ? 'font-mono' : ''} ${
      status === 'good' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-400' : status === 'bad' ? 'text-red-400' : ''
    }`}>{value}</span>
  </div>
);

// ============================================
// History Card (Mobile)
// ============================================
const HistoryCard = ({ m }: { m: any }) => (
  <div className="p-2.5 space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-muted-foreground">{m.id?.slice(0, 12)}</span>
      <StatusBadge status={m.status} />
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold font-mono text-foreground">{Number(m.amount_requested).toLocaleString()} BSK</span>
      <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), 'MM/dd HH:mm')}</span>
    </div>
    <div className="text-[10px] font-mono text-muted-foreground">{m.wallet_address?.slice(0, 16)}...{m.wallet_address?.slice(-6)}</div>
    {m.tx_hash && (
      <a href={`https://bscscan.com/tx/${m.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
        TX: {m.tx_hash.slice(0, 14)}… <ExternalLink className="h-2.5 w-2.5" />
      </a>
    )}
    {m.rejection_reason && (
      <p className="text-[10px] text-red-400 truncate">Reason: {m.rejection_reason}</p>
    )}
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>Fee: {m.migration_fee_percent || 5}%</span>
      <span>Net: {Number(m.net_amount_migrated || 0).toLocaleString()}</span>
    </div>
  </div>
);

// ============================================
// Settings Panel
// ============================================
const SettingsPanel = ({ settings, hotWallet, onUpdate, saving }: { settings: any; hotWallet: any; onUpdate: (u: Record<string, any>) => void; saving: boolean }) => {
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
    <div className="space-y-4 max-w-2xl">
      {/* System Status */}
      <SectionHeader icon={<Activity className="h-3 w-3" />} title="System Status" />
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[hsl(220_13%_7%)] border border-[hsl(220_13%_14%)] rounded p-2">
          <span className="text-[10px] text-muted-foreground uppercase">Hot Wallet Balance</span>
          <p className="text-sm font-mono font-bold text-foreground">{hotWallet ? `${Number(hotWallet.bnbBalance).toFixed(4)} BNB` : 'N/A'}</p>
        </div>
        <div className="bg-[hsl(220_13%_7%)] border border-[hsl(220_13%_14%)] rounded p-2">
          <span className="text-[10px] text-muted-foreground uppercase">Migration Status</span>
          <p className={`text-sm font-bold ${local.migration_enabled ? 'text-emerald-400' : 'text-red-400'}`}>
            {local.migration_enabled ? 'ENABLED' : 'DISABLED'}
          </p>
        </div>
      </div>

      {/* Toggles */}
      <SectionHeader icon={<Settings className="h-3 w-3" />} title="System Toggles" />
      <div className="space-y-2">
        <ToggleRow
          label="Migration Enabled"
          value={local.migration_enabled}
          onChange={() => setLocal(p => ({ ...p, migration_enabled: !p.migration_enabled }))}
        />
        <ToggleRow
          label="Maintenance Mode"
          value={local.maintenance_mode}
          onChange={() => setLocal(p => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
          danger
        />
      </div>

      {/* Limits */}
      <SectionHeader icon={<Shield className="h-3 w-3" />} title="Limits" />
      <div className="grid grid-cols-2 gap-2">
        <CompactInput label="Min Amount (BSK)" value={local.min_amount_bsk} onChange={(v) => setLocal(p => ({ ...p, min_amount_bsk: v }))} type="number" />
        <CompactInput label="Max Amount (BSK)" value={local.max_amount_bsk} onChange={(v) => setLocal(p => ({ ...p, max_amount_bsk: v }))} type="number" placeholder="No limit" />
        <CompactInput label="Max Per Request (BSK)" value={local.max_per_request_bsk} onChange={(v) => setLocal(p => ({ ...p, max_per_request_bsk: v }))} type="number" placeholder="No limit" />
        <CompactInput label="Daily User Limit (BSK)" value={local.per_user_daily_limit_bsk} onChange={(v) => setLocal(p => ({ ...p, per_user_daily_limit_bsk: v }))} type="number" placeholder="No limit" />
      </div>

      {/* Fee */}
      <SectionHeader icon={<TrendingUp className="h-3 w-3" />} title="Fee" />
      <div className="grid grid-cols-2 gap-2">
        <CompactInput label="Fee %" value={local.migration_fee_percent} onChange={(v) => setLocal(p => ({ ...p, migration_fee_percent: v }))} type="number" />
        <CompactInput label="Maintenance Message" value={local.maintenance_message} onChange={(v) => setLocal(p => ({ ...p, maintenance_message: v }))} />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90">
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        SAVE SETTINGS
      </Button>
    </div>
  );
};

// ============================================
// Toggle Row
// ============================================
const ToggleRow = ({ label, value, onChange, danger }: { label: string; value: boolean; onChange: () => void; danger?: boolean }) => (
  <div className="flex items-center justify-between bg-[hsl(220_13%_7%)] border border-[hsl(220_13%_14%)] rounded px-3 py-2">
    <span className="text-xs text-foreground">{label}</span>
    <button onClick={onChange} className={`w-9 h-5 rounded-full transition-colors relative ${value ? (danger ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-[hsl(220_13%_20%)]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  </div>
);

// ============================================
// Compact Input
// ============================================
const CompactInput = ({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div>
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-0.5 h-7 text-xs bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%)]"
    />
  </div>
);

export default AdminMigrationControl;
