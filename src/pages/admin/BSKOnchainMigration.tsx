import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Loader2,
  Users,
  Coins,
  Fuel,
  Download,
  FileText,
  FileSpreadsheet,
  Wallet,
  WalletCards
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  BSKUserExportData, 
  BSKMigrationReportStats, 
  generateBSKMigrationPDF, 
  generateBSKMigrationCSV,
  calculateStats 
} from '@/utils/bskMigrationPdfExport';

interface MigrationBatch {
  id: string;
  batch_number: string;
  status: string;
  total_users: number;
  processed_users: number;
  successful_users: number;
  failed_users: number;
  total_bsk_requested: number;
  total_bsk_migrated: number;
  total_gas_deducted_bsk: number;
  total_gas_spent_bnb: number;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
}

interface Migration {
  id: string;
  user_id: string;
  wallet_address: string;
  internal_balance_snapshot: number;
  amount_requested: number;
  gas_deduction_bsk: number;
  net_amount_migrated: number;
  status: string;
  tx_hash: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
}

interface EligibleUser {
  user_id: string;
  email: string;
  display_name: string;
  wallet_address: string;
  withdrawable_balance: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  validating: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  debiting: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  signing: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  broadcasting: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  confirming: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  failed: 'bg-red-500/20 text-red-400 border-red-500/50',
  rolled_back: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  partial: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

// Component to show all migrations (user-initiated and admin batches)
function AllMigrationsTable() {
  const [migrations, setMigrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');

  useEffect(() => {
    fetchAllMigrations();
  }, []);

  const fetchAllMigrations = async () => {
    setLoading(true);
    try {
      // Get all migrations with user info
      const { data: migrationsData, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch user profiles for these migrations
      const userIds = [...new Set(migrationsData?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username, display_name')
        .in('user_id', userIds);

      // Merge data
      const enriched = migrationsData?.map(m => ({
        ...m,
        user: profiles?.find(p => p.user_id === m.user_id)
      })) || [];

      setMigrations(enriched);
    } catch (err) {
      console.error('Error fetching migrations:', err);
      toast.error('Failed to fetch migrations');
    } finally {
      setLoading(false);
    }
  };

  const filteredMigrations = migrations.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'completed') return m.status === 'completed';
    if (filter === 'failed') return m.status === 'failed' || m.status === 'rolled_back';
    if (filter === 'pending') return !['completed', 'failed', 'rolled_back'].includes(m.status);
    return true;
  });

  const stats = {
    total: migrations.length,
    completed: migrations.filter(m => m.status === 'completed').length,
    failed: migrations.filter(m => m.status === 'failed' || m.status === 'rolled_back').length,
    pending: migrations.filter(m => !['completed', 'failed', 'rolled_back'].includes(m.status)).length,
    totalBsk: migrations.filter(m => m.status === 'completed').reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('all')}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Migrations</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('completed')}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('failed')}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed/Refunded</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('pending')}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.totalBsk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BSK Migrated</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('all')}>All</Badge>
          <Badge variant={filter === 'completed' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('completed')}>Completed</Badge>
          <Badge variant={filter === 'pending' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('pending')}>Pending</Badge>
          <Badge variant={filter === 'failed' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('failed')}>Failed</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllMigrations} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Migrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Migration History</CardTitle>
          <CardDescription>All on-chain migration transactions (user-initiated and admin batches)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredMigrations.map((m) => (
                  <div 
                    key={m.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {m.user?.display_name || m.user?.username || m.user?.email || 'Unknown User'}
                          </span>
                          <Badge className={statusColors[m.status] || statusColors.pending}>
                            {m.status}
                          </Badge>
                          {m.admin_notes?.includes('User-initiated') && (
                            <Badge variant="outline" className="text-xs">User</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Email: {m.user?.email || 'N/A'}</div>
                          <div className="font-mono">Wallet: {m.wallet_address?.slice(0, 10)}...{m.wallet_address?.slice(-8)}</div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className="font-bold">{Number(m.amount_requested).toLocaleString()} BSK</div>
                        {m.net_amount_migrated && (
                          <div className="text-sm text-green-500">
                            Net: {Number(m.net_amount_migrated).toLocaleString()} BSK
                          </div>
                        )}
                        {m.gas_deduction_bsk && (
                          <div className="text-xs text-muted-foreground">
                            Gas: -{Number(m.gas_deduction_bsk).toFixed(2)} BSK
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                      <span>{format(new Date(m.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                      <div className="flex items-center gap-2">
                        {m.tx_hash && (
                          <a
                            href={`https://bscscan.com/tx/${m.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            View TX <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {m.error_message && (
                          <span className="text-red-400 truncate max-w-[200px]" title={m.error_message}>
                            Error: {m.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMigrations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No migrations found
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BSKOnchainMigration() {
  const [batches, setBatches] = useState<MigrationBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<MigrationBatch | null>(null);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [minAmount, setMinAmount] = useState(100);
  
  // Export states
  const [exportLoading, setExportLoading] = useState(false);
  const [allUsersExportData, setAllUsersExportData] = useState<BSKUserExportData[]>([]);
  const [exportStats, setExportStats] = useState<BSKMigrationReportStats | null>(null);
  const [walletFilter, setWalletFilter] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    fetchBatches();
    fetchEligibleUsers();
    fetchAllUsersForExport();
  }, []);

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from('bsk_onchain_migration_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      toast.error('Failed to fetch batches');
      return;
    }

    setBatches(data || []);
  };

  const fetchEligibleUsers = async () => {
    // Fetch users with >= 100 BSK and linked wallets
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, bsc_wallet_address, wallet_address');

    if (profileError) {
      toast.error('Failed to fetch profiles');
      return;
    }

    const usersWithWallets = profiles?.filter(p => p.bsc_wallet_address || p.wallet_address) || [];
    const userIds = usersWithWallets.map(p => p.user_id);

    const { data: balances } = await supabase
      .from('user_bsk_balances')
      .select('user_id, withdrawable_balance')
      .in('user_id', userIds)
      .gte('withdrawable_balance', 100);

    const eligible: EligibleUser[] = [];
    balances?.forEach(b => {
      const profile = usersWithWallets.find(p => p.user_id === b.user_id);
      if (profile) {
        eligible.push({
          user_id: b.user_id,
          email: profile.email || '',
          display_name: profile.display_name || '',
          wallet_address: (profile.bsc_wallet_address || profile.wallet_address)!,
          withdrawable_balance: Number(b.withdrawable_balance)
        });
      }
    });

    setEligibleUsers(eligible.sort((a, b) => b.withdrawable_balance - a.withdrawable_balance));
  };

  // Fetch ALL users with 100+ BSK for comprehensive export (with and without wallets)
  const fetchAllUsersForExport = async () => {
    try {
      // 1. Get all users with 100+ BSK withdrawable
      const { data: balances, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('user_id, withdrawable_balance, holding_balance')
        .gte('withdrawable_balance', 100)
        .order('withdrawable_balance', { ascending: false });

      if (balanceError) {
        console.error('Balance fetch error:', balanceError);
        return;
      }

      const userIds = balances?.map(b => b.user_id) || [];

      // 2. Get profiles for all these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id, email, username, display_name, full_name, phone,
          bsc_wallet_address, wallet_address,
          kyc_status, account_status, created_at
        `)
        .in('user_id', userIds);

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }

      // 3. Get sponsor relationships
      const { data: referrals, error: refError } = await supabase
        .from('referral_tree')
        .select('user_id, direct_sponsor_id')
        .in('user_id', userIds)
        .eq('level', 1);

      // 4. Get sponsor profiles
      const sponsorIds = referrals
        ?.map(r => r.direct_sponsor_id)
        .filter((id): id is string => !!id) || [];
      
      let sponsors: { user_id: string; username: string | null; email: string | null }[] = [];
      if (sponsorIds.length > 0) {
        const { data: sponsorData } = await supabase
          .from('profiles')
          .select('user_id, username, email')
          .in('user_id', sponsorIds);
        sponsors = sponsorData || [];
      }

      // 5. Merge all data
      const exportData: BSKUserExportData[] = [];
      balances?.forEach((balance, index) => {
        const profile = profiles?.find(p => p.user_id === balance.user_id);
        const referral = referrals?.find(r => r.user_id === balance.user_id);
        const sponsor = referral?.direct_sponsor_id 
          ? sponsors.find(s => s.user_id === referral.direct_sponsor_id)
          : null;

        exportData.push({
          row_number: index + 1,
          user_id: balance.user_id,
          username: profile?.username || null,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          wallet_address: profile?.bsc_wallet_address || profile?.wallet_address || null,
          withdrawable_balance: Number(balance.withdrawable_balance),
          holding_balance: Number(balance.holding_balance || 0),
          kyc_status: profile?.kyc_status || null,
          account_status: profile?.account_status || null,
          sponsor_username: sponsor?.username || null,
          sponsor_email: sponsor?.email || null,
          created_at: profile?.created_at || '',
        });
      });

      setAllUsersExportData(exportData);
      setExportStats(calculateStats(exportData));

      console.log(`[Export] Loaded ${exportData.length} users for export`);
    } catch (err) {
      console.error('Error fetching export data:', err);
    }
  };

  const handleExportPDF = async () => {
    if (allUsersExportData.length === 0) {
      toast.error('No data to export. Please wait for data to load.');
      return;
    }

    setExportLoading(true);
    try {
      // Filter data based on wallet filter
      let dataToExport = allUsersExportData;
      if (walletFilter === 'with') {
        dataToExport = allUsersExportData.filter(u => u.wallet_address);
      } else if (walletFilter === 'without') {
        dataToExport = allUsersExportData.filter(u => !u.wallet_address);
      }

      // Recalculate row numbers
      dataToExport = dataToExport.map((u, i) => ({ ...u, row_number: i + 1 }));
      
      const stats = calculateStats(dataToExport);
      generateBSKMigrationPDF(dataToExport, stats);
      toast.success(`PDF exported with ${dataToExport.length} users`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (allUsersExportData.length === 0) {
      toast.error('No data to export. Please wait for data to load.');
      return;
    }

    setExportLoading(true);
    try {
      // Filter data based on wallet filter
      let dataToExport = allUsersExportData;
      if (walletFilter === 'with') {
        dataToExport = allUsersExportData.filter(u => u.wallet_address);
      } else if (walletFilter === 'without') {
        dataToExport = allUsersExportData.filter(u => !u.wallet_address);
      }

      // Recalculate row numbers
      dataToExport = dataToExport.map((u, i) => ({ ...u, row_number: i + 1 }));
      
      generateBSKMigrationCSV(dataToExport);
      toast.success(`CSV exported with ${dataToExport.length} users`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to generate CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const fetchBatchMigrations = async (batchId: string) => {
    const { data, error } = await supabase
      .from('bsk_onchain_migrations')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to fetch migrations');
      return;
    }

    setMigrations(data || []);
  };

  const createBatch = async () => {
    if (eligibleUsers.length === 0) {
      toast.error('No eligible users for migration');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-migrate-bsk-onchain', {
        body: {
          action: 'create_batch',
          notes: notes || `Bulk migration - ${new Date().toISOString()}`
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Batch created with ${data.total_users} users`);
      setNotes('');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const processMigration = async (migrationId: string) => {
    setProcessingId(migrationId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-migrate-bsk-onchain', {
        body: {
          action: 'process_migration',
          migration_id: migrationId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Migration completed: ${data.net_amount_transferred} BSK transferred`);
      if (selectedBatch) {
        fetchBatchMigrations(selectedBatch.id);
        fetchBatches();
      }
    } catch (err: any) {
      toast.error(err.message || 'Migration failed');
      if (selectedBatch) fetchBatchMigrations(selectedBatch.id);
    } finally {
      setProcessingId(null);
    }
  };

  const retryMigration = async (migrationId: string) => {
    setProcessingId(migrationId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-migrate-bsk-onchain', {
        body: {
          action: 'retry_failed',
          migration_id: migrationId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Retry successful');
      if (selectedBatch) fetchBatchMigrations(selectedBatch.id);
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    } finally {
      setProcessingId(null);
    }
  };

  const rollbackMigration = async (migrationId: string) => {
    setProcessingId(migrationId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-migrate-bsk-onchain', {
        body: {
          action: 'rollback_failed',
          migration_id: migrationId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Rollback completed - balance restored');
      if (selectedBatch) {
        fetchBatchMigrations(selectedBatch.id);
        fetchBatches();
      }
    } catch (err: any) {
      toast.error(err.message || 'Rollback failed');
    } finally {
      setProcessingId(null);
    }
  };

  const processAllPending = async () => {
    if (!selectedBatch) return;
    
    const pending = migrations.filter(m => m.status === 'pending');
    if (pending.length === 0) {
      toast.info('No pending migrations');
      return;
    }

    toast.info(`Processing ${pending.length} migrations...`);
    
    for (const migration of pending) {
      await processMigration(migration.id);
      // Small delay between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    toast.success('Batch processing complete');
    fetchBatches();
  };

  const selectBatch = (batch: MigrationBatch) => {
    setSelectedBatch(batch);
    fetchBatchMigrations(batch.id);
  };

  const totalEligibleBsk = eligibleUsers.reduce((sum, u) => sum + u.withdrawable_balance, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BSK On-Chain Migration</h1>
          <p className="text-muted-foreground">
            Migrate internal BSK balances to on-chain BEP-20 tokens
          </p>
        </div>
        <Button onClick={() => { fetchBatches(); fetchEligibleUsers(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="all-migrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-migrations">All Migrations</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Migration Batches</TabsTrigger>
          <TabsTrigger value="eligible">Eligible Users</TabsTrigger>
        </TabsList>

        {/* All Migrations Tab - Shows all user and admin migrations */}
        <TabsContent value="all-migrations" className="space-y-4">
          <AllMigrationsTable />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Eligible Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eligibleUsers.length}</div>
                <p className="text-xs text-muted-foreground">With ≥100 BSK</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Total BSK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEligibleBsk.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Ready for migration</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {batches.reduce((sum, b) => sum + b.successful_users, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Migrations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Fuel className="w-4 h-4" />
                  Gas Spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {batches.reduce((sum, b) => sum + Number(b.total_gas_spent_bnb || 0), 0).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">BNB total</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create New Migration Batch</CardTitle>
              <CardDescription>
                Create a batch to migrate all eligible users' BSK to on-chain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Migration notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={createBatch} disabled={loading || eligibleUsers.length === 0}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Create Batch ({eligibleUsers.length} users, {totalEligibleBsk.toLocaleString()} BSK)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Migration Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        onClick={() => selectBatch(batch)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedBatch?.id === batch.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{batch.batch_number}</span>
                          <Badge className={statusColors[batch.status]}>
                            {batch.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {batch.successful_users}/{batch.total_users} users •{' '}
                          {Number(batch.total_bsk_migrated).toLocaleString()} BSK migrated
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(batch.created_at), 'PPp')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedBatch ? `Migrations - ${selectedBatch.batch_number}` : 'Select a Batch'}
                  </CardTitle>
                  {selectedBatch && (
                    <Button
                      size="sm"
                      onClick={processAllPending}
                      disabled={!migrations.some(m => m.status === 'pending')}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Process All Pending
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {selectedBatch ? (
                    <div className="space-y-2">
                      {migrations.map((migration) => (
                        <div
                          key={migration.id}
                          className="p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-xs truncate max-w-[150px]">
                              {migration.wallet_address}
                            </div>
                            <Badge className={statusColors[migration.status]}>
                              {migration.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            {Number(migration.amount_requested).toLocaleString()} BSK
                            {migration.status === 'completed' && (
                              <span className="text-green-500 ml-2">
                                (net: {Number(migration.net_amount_migrated).toLocaleString()})
                              </span>
                            )}
                          </div>
                          
                          {migration.tx_hash && (
                            <a
                              href={`https://bscscan.com/tx/${migration.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {migration.tx_hash.slice(0, 16)}...
                            </a>
                          )}
                          
                          {migration.error_message && (
                            <div className="text-xs text-red-400 mt-1 truncate">
                              {migration.error_message}
                            </div>
                          )}

                          <div className="flex gap-2 mt-2">
                            {migration.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processMigration(migration.id)}
                                disabled={processingId === migration.id}
                              >
                                {processingId === migration.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            {migration.status === 'failed' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryMigration(migration.id)}
                                  disabled={processingId === migration.id}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Retry
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rollbackMigration(migration.id)}
                                  disabled={processingId === migration.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rollback
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select a batch to view migrations
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="eligible" className="space-y-4">
          {/* Export Stats Summary */}
          {exportStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total Users (100+ BSK)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{exportStats.total_users}</div>
                  <p className="text-xs text-muted-foreground">{exportStats.total_bsk.toLocaleString()} BSK total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-500" />
                    With Wallet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{exportStats.users_with_wallet}</div>
                  <p className="text-xs text-muted-foreground">{exportStats.bsk_with_wallet.toLocaleString()} BSK ({((exportStats.users_with_wallet / exportStats.total_users) * 100).toFixed(1)}%)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <WalletCards className="w-4 h-4 text-orange-500" />
                    Without Wallet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{exportStats.users_without_wallet}</div>
                  <p className="text-xs text-muted-foreground">{exportStats.bsk_without_wallet.toLocaleString()} BSK ({((exportStats.users_without_wallet / exportStats.total_users) * 100).toFixed(1)}%)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    KYC Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    <span className="text-green-500">{exportStats.kyc_approved}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-orange-500">{exportStats.kyc_pending}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approved / Pending</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>All Users with ≥100 BSK</CardTitle>
                  <CardDescription>
                    Complete list of all users with 100+ BSK for export and analysis
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Wallet Filter */}
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button
                      variant={walletFilter === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setWalletFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={walletFilter === 'with' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setWalletFilter('with')}
                    >
                      With Wallet
                    </Button>
                    <Button
                      variant={walletFilter === 'without' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setWalletFilter('without')}
                    >
                      No Wallet
                    </Button>
                  </div>
                  
                  {/* Export Buttons */}
                  <Button
                    onClick={handleExportPDF}
                    disabled={exportLoading || allUsersExportData.length === 0}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {exportLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    disabled={exportLoading || allUsersExportData.length === 0}
                    variant="outline"
                  >
                    {exportLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {allUsersExportData
                    .filter(user => {
                      if (walletFilter === 'with') return !!user.wallet_address;
                      if (walletFilter === 'without') return !user.wallet_address;
                      return true;
                    })
                    .map((user, index) => (
                    <div
                      key={user.user_id}
                      className="p-3 rounded-lg border border-border flex items-center justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-8">{index + 1}</span>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.username || user.email?.split('@')[0] || user.user_id.slice(0, 8)}
                            {user.kyc_status === 'approved' ? (
                              <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs">KYC</Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                          {user.wallet_address ? (
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Wallet className="w-3 h-3 text-green-500" />
                              {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-6)}
                            </div>
                          ) : (
                            <div className="text-xs text-orange-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              No wallet linked
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {user.withdrawable_balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">BSK (withdrawable)</div>
                        {user.sponsor_username && (
                          <div className="text-xs text-muted-foreground">
                            Sponsor: {user.sponsor_username}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {allUsersExportData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading user data...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
