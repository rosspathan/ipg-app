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
  Fuel
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function BSKOnchainMigration() {
  const [batches, setBatches] = useState<MigrationBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<MigrationBatch | null>(null);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [minAmount, setMinAmount] = useState(100);

  useEffect(() => {
    fetchBatches();
    fetchEligibleUsers();
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Migration Batches</TabsTrigger>
          <TabsTrigger value="eligible">Eligible Users</TabsTrigger>
        </TabsList>

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

        <TabsContent value="eligible">
          <Card>
            <CardHeader>
              <CardTitle>Eligible Users for Migration</CardTitle>
              <CardDescription>
                Users with ≥100 BSK withdrawable balance and linked wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {eligibleUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="p-3 rounded-lg border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {user.display_name || user.email || user.user_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.wallet_address}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {user.withdrawable_balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">BSK</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
