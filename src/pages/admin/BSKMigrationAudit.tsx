import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  RefreshCw, 
  Download, 
  ExternalLink,
  Loader2,
  Users,
  Coins,
  Search,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Wallet,
  TrendingUp,
  ArrowRightLeft,
  X,
  Filter,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ============= Types =============
interface MigrationRecord {
  id: string;
  user_id: string;
  wallet_address: string;
  internal_balance_snapshot: number;
  amount_requested: number;
  migration_fee_bsk: number;
  migration_fee_percent: number;
  gas_deduction_bsk: number;
  net_amount_migrated: number;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  error_message: string | null;
  admin_notes: string | null;
  created_at: string;
  validated_at: string | null;
  debited_at: string | null;
  broadcasted_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  rolled_back_at: string | null;
  ledger_debit_tx_id: string | null;
  idempotency_key: string | null;
  user?: {
    email: string | null;
    username: string | null;
    phone: string | null;
    display_name: string | null;
  };
}

interface UserBSKSummary {
  user_id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  display_name: string | null;
  withdrawable_balance: number;
  holding_balance: number;
  total_migrated_requested: number;
  total_migrated_net: number;
  total_fees_paid: number;
  last_migration_date: string | null;
  migrations_completed: number;
  migrations_failed: number;
  migrations_pending: number;
  migrations_total: number;
  last_wallet_used: string | null;
  flags: {
    high_balance: boolean;
    frequent_failures: boolean;
    has_pending: boolean;
  };
}

interface GlobalStats {
  total_users_with_balance: number;
  total_withdrawable_bsk: number;
  total_migrated_requested: number;
  total_migrated_net: number;
  total_fees_collected: number;
  total_gas_collected: number;
  migrations_completed: number;
  migrations_failed: number;
  migrations_pending: number;
  users_with_failures: number;
}

// ============= Status Config =============
const statusColors: Record<string, string> = {
  created: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  validated: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  debited: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  signed: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  broadcasted: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  failed: 'bg-red-500/20 text-red-400 border-red-500/50',
  refunded: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  rolled_back: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case 'failed': 
    case 'rolled_back': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case 'refunded': return <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />;
    default: return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
  }
};

// ============= Utilities =============
function formatBSK(value: number, short = false): string {
  if (short) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(2);
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    toast.success(label ? `${label} copied` : 'Copied');
  };

  return (
    <button
      onClick={copyToClipboard}
      className={cn("p-1 hover:bg-muted rounded transition-colors", className)}
    >
      <Copy className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

// ============= Stat Card Component =============
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'text-foreground',
  subValue,
  onClick
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  color?: string;
  subValue?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={cn(
        "p-3 sm:p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className={cn("text-lg sm:text-2xl font-bold truncate", color)}>{value}</p>
          {subValue && <p className="text-[10px] text-muted-foreground truncate">{subValue}</p>}
        </div>
        <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5 shrink-0", color)} />
      </div>
    </Card>
  );
}

// ============= Migration Detail Drawer =============
function MigrationDetailDrawer({ 
  migration, 
  onClose 
}: { 
  migration: MigrationRecord | null; 
  onClose: () => void;
}) {
  if (!migration) return null;

  return (
    <Sheet open={!!migration} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Migration Details</SheetTitle>
            <Badge className={cn("text-xs", statusColors[migration.status])}>
              <StatusIcon status={migration.status} />
              <span className="ml-1">{migration.status.toUpperCase()}</span>
            </Badge>
          </div>
        </SheetHeader>
        
        <div className="p-4 space-y-4">
          {/* User Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{migration.user?.display_name || migration.user?.username || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs truncate max-w-[180px]">{migration.user?.email || 'N/A'}</span>
                  {migration.user?.email && <CopyButton value={migration.user.email} />}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">User ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{migration.user_id.slice(0, 8)}...</span>
                  <CopyButton value={migration.user_id} label="User ID" />
                </div>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amounts</h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested</span>
                <span className="font-bold">{formatBSK(Number(migration.amount_requested))} BSK</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Migration Fee ({migration.migration_fee_percent || 0}%)</span>
                <span>-{formatBSK(Number(migration.migration_fee_bsk || 0))} BSK</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>Gas Fee</span>
                <span>-{formatBSK(Number(migration.gas_deduction_bsk || 0))} BSK</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/50 font-bold text-green-400">
                <span>Net Received</span>
                <span>{formatBSK(Number(migration.net_amount_migrated || 0))} BSK</span>
              </div>
            </div>
          </div>

          {/* Blockchain */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Blockchain</h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Wallet</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{migration.wallet_address?.slice(0, 8)}...{migration.wallet_address?.slice(-6)}</span>
                  <CopyButton value={migration.wallet_address} label="Wallet" />
                </div>
              </div>
              {migration.tx_hash && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://bscscan.com/tx/${migration.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-xs flex items-center gap-1"
                    >
                      {migration.tx_hash.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <CopyButton value={migration.tx_hash} label="Tx Hash" />
                  </div>
                </div>
              )}
              {migration.block_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Block</span>
                  <span className="font-mono">{migration.block_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
              {[
                { label: 'Created', date: migration.created_at },
                { label: 'Validated', date: migration.validated_at },
                { label: 'Debited', date: migration.debited_at },
                { label: 'Broadcasted', date: migration.broadcasted_at },
                { label: 'Confirmed', date: migration.confirmed_at },
                { label: 'Completed', date: migration.completed_at, color: 'text-green-400' },
                { label: 'Failed', date: migration.failed_at, color: 'text-red-400' },
                { label: 'Refunded', date: migration.refunded_at, color: 'text-cyan-400' },
              ].filter(t => t.date).map(t => (
                <div key={t.label} className={cn("flex justify-between", t.color)}>
                  <span>{t.label}</span>
                  <span>{format(new Date(t.date!), 'MMM d, HH:mm:ss')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Internal IDs */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Internal</h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Request ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{migration.id.slice(0, 8)}...</span>
                  <CopyButton value={migration.id} label="Request ID" />
                </div>
              </div>
              {migration.ledger_debit_tx_id && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ledger ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">{migration.ledger_debit_tx_id.slice(0, 8)}...</span>
                    <CopyButton value={migration.ledger_debit_tx_id} label="Ledger ID" />
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Snapshot</span>
                <span>{formatBSK(Number(migration.internal_balance_snapshot))} BSK</span>
              </div>
            </div>
          </div>

          {/* Error/Notes */}
          {(migration.error_message || migration.admin_notes) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                {migration.error_message && (
                  <div className="text-red-400 text-xs">
                    <span className="font-semibold">Error: </span>
                    {migration.error_message}
                  </div>
                )}
                {migration.admin_notes && (
                  <div className="text-muted-foreground text-xs">{migration.admin_notes}</div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {migration.status === 'completed' && !migration.tx_hash && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2 text-yellow-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Completed but missing tx_hash - needs investigation</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============= User Detail Drawer =============
function UserDetailDrawer({ 
  user, 
  onClose 
}: { 
  user: UserBSKSummary | null; 
  onClose: () => void;
}) {
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<MigrationRecord | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserMigrations();
    }
  }, [user]);

  const fetchUserMigrations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMigrations(data || []);
    } catch (err) {
      console.error('Error fetching user migrations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Sheet open={!!user} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onClose()}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
              <SheetTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Migration Audit
              </SheetTitle>
            </div>
          </SheetHeader>
          
          <div className="p-4 space-y-4">
            {/* User Header */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {user.display_name || user.username || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
                <div className="flex gap-1">
                  {user.flags.high_balance && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-[10px]">
                      High Balance
                    </Badge>
                  )}
                  {user.flags.frequent_failures && (
                    <Badge variant="outline" className="text-red-400 border-red-400/50 text-[10px]">
                      Failures
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <span>ID: {user.user_id}</span>
                <CopyButton value={user.user_id} label="User ID" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{formatBSK(user.withdrawable_balance, true)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Withdrawable BSK</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{formatBSK(user.total_migrated_net, true)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Migrated</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{formatBSK(user.total_fees_paid, true)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Fees Paid</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">
                  <span className="text-green-500">{user.migrations_completed}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-500">{user.migrations_failed}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-yellow-500">{user.migrations_pending}</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">✓ / ✗ / ⏳</p>
              </div>
            </div>

            {/* Last Wallet */}
            {user.last_wallet_used && (
              <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">Last Wallet</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span>{user.last_wallet_used.slice(0, 10)}...{user.last_wallet_used.slice(-6)}</span>
                  <CopyButton value={user.last_wallet_used} label="Wallet" />
                </div>
              </div>
            )}

            {/* Migration History */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Migration History ({migrations.length})
              </h4>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : migrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No migrations yet
                </div>
              ) : (
                <div className="space-y-2">
                  {migrations.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMigration({ ...m, user: { email: user.email, username: user.username, phone: user.phone, display_name: user.display_name } })}
                      className="bg-muted/20 hover:bg-muted/40 rounded-lg p-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={cn("text-[10px]", statusColors[m.status])}>
                          <StatusIcon status={m.status} />
                          <span className="ml-1">{m.status}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(m.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold">{formatBSK(Number(m.amount_requested))}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="text-green-500 font-semibold">{formatBSK(Number(m.net_amount_migrated))}</span>
                          <span className="text-muted-foreground text-xs"> BSK</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {m.tx_hash && (
                        <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
                          Tx: {m.tx_hash.slice(0, 16)}...
                        </div>
                      )}
                      {m.error_message && (
                        <div className="mt-1 text-xs text-red-400 truncate">
                          Error: {m.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <MigrationDetailDrawer
        migration={selectedMigration}
        onClose={() => setSelectedMigration(null)}
      />
    </>
  );
}

// ============= All Migrations Tab =============
function AllMigrationsTab() {
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMigration, setSelectedMigration] = useState<MigrationRecord | null>(null);

  const fetchMigrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: migrationsData, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const userIds = [...new Set(migrationsData?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username, phone, display_name')
        .in('user_id', userIds);

      const enriched: MigrationRecord[] = migrationsData?.map(m => ({
        ...m,
        user: profiles?.find(p => p.user_id === m.user_id) || null
      })) || [];

      setMigrations(enriched);
    } catch (err) {
      console.error('Error fetching migrations:', err);
      toast.error('Failed to fetch migrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMigrations();
  }, [fetchMigrations]);

  const filteredMigrations = useMemo(() => {
    let result = [...migrations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.user_id.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query) ||
        m.user?.username?.toLowerCase().includes(query) ||
        m.wallet_address?.toLowerCase().includes(query) ||
        m.tx_hash?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'failed') {
        result = result.filter(m => ['failed', 'rolled_back'].includes(m.status));
      } else if (statusFilter === 'pending') {
        result = result.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status));
      } else {
        result = result.filter(m => m.status === statusFilter);
      }
    }

    return result;
  }, [migrations, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const completed = migrations.filter(m => m.status === 'completed');
    return {
      total: migrations.length,
      completed: completed.length,
      failed: migrations.filter(m => ['failed', 'rolled_back'].includes(m.status)).length,
      pending: migrations.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status)).length,
      totalBsk: completed.reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
      totalFees: completed.reduce((sum, m) => sum + Number(m.migration_fee_bsk || 0) + Number(m.gas_deduction_bsk || 0), 0),
    };
  }, [migrations]);

  const exportCSV = () => {
    const headers = ['Date', 'Request ID', 'User', 'Email', 'Amount', 'Fee', 'Gas', 'Net', 'Wallet', 'Status', 'Tx Hash', 'Error'];
    const rows = filteredMigrations.map(m => [
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
      m.id,
      m.user?.username || m.user?.display_name || '',
      m.user?.email || '',
      Number(m.amount_requested).toFixed(4),
      Number(m.migration_fee_bsk || 0).toFixed(4),
      Number(m.gas_deduction_bsk || 0).toFixed(4),
      Number(m.net_amount_migrated || 0).toFixed(4),
      m.wallet_address,
      m.status,
      m.tx_hash || '',
      m.error_message || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Migrations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <StatCard label="Total" value={stats.total} icon={ArrowRightLeft} onClick={() => setStatusFilter('all')} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-green-500" onClick={() => setStatusFilter('completed')} />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} color="text-red-500" onClick={() => setStatusFilter('failed')} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-yellow-500" onClick={() => setStatusFilter('pending')} />
        <StatCard label="Net Migrated" value={formatBSK(stats.totalBsk, true)} icon={TrendingUp} color="text-primary" subValue="BSK" />
        <StatCard label="Fees" value={formatBSK(stats.totalFees, true)} icon={Coins} color="text-orange-400" subValue="BSK" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchMigrations} disabled={loading} className="h-9">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredMigrations.length} of {migrations.length}
      </p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMigrations.map((m) => (
            <Card
              key={m.id}
              className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedMigration(m)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {m.user?.display_name || m.user?.username || m.user?.email?.split('@')[0] || 'Unknown'}
                    </span>
                    <Badge className={cn("text-[10px] shrink-0", statusColors[m.status])}>
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{formatBSK(Number(m.amount_requested))} BSK</p>
                  {m.status === 'completed' && (
                    <p className="text-xs text-green-500">→ {formatBSK(Number(m.net_amount_migrated))}</p>
                  )}
                  {m.tx_hash && (
                    <a
                      href={`https://bscscan.com/tx/${m.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-primary hover:underline flex items-center justify-end gap-0.5 mt-1"
                    >
                      BscScan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredMigrations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No migrations found
            </div>
          )}
        </div>
      )}

      <MigrationDetailDrawer
        migration={selectedMigration}
        onClose={() => setSelectedMigration(null)}
      />
    </div>
  );
}

// ============= Users Remaining BSK Tab =============
function UsersRemainingTab() {
  const [users, setUsers] = useState<UserBSKSummary[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [showOnlyWithMigrations, setShowOnlyWithMigrations] = useState(false);
  const [showOnlyWithFailures, setShowOnlyWithFailures] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserBSKSummary | null>(null);

  // Fetch global stats from migrations directly (not from filtered users)
  const fetchGlobalStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Get user balance totals
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance');

      if (balanceError) throw balanceError;

      const totalWithdrawable = balanceData?.reduce((sum, b) => sum + Number(b.withdrawable_balance || 0), 0) || 0;
      const usersWithBalance = balanceData?.filter(b => Number(b.withdrawable_balance) > 0).length || 0;

      // Get migration stats directly from migrations table
      const { data: migrationData, error: migrationError } = await supabase
        .from('bsk_onchain_migrations')
        .select('status, amount_requested, net_amount_migrated, migration_fee_bsk, gas_deduction_bsk, user_id');

      if (migrationError) throw migrationError;

      const completed = migrationData?.filter(m => m.status === 'completed') || [];
      const failed = migrationData?.filter(m => ['failed', 'rolled_back'].includes(m.status)) || [];
      const pending = migrationData?.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status)) || [];

      const usersWithFailures = new Set(failed.map(m => m.user_id)).size;

      setGlobalStats({
        total_users_with_balance: usersWithBalance,
        total_withdrawable_bsk: totalWithdrawable,
        total_migrated_requested: completed.reduce((sum, m) => sum + Number(m.amount_requested || 0), 0),
        total_migrated_net: completed.reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
        total_fees_collected: completed.reduce((sum, m) => sum + Number(m.migration_fee_bsk || 0), 0),
        total_gas_collected: completed.reduce((sum, m) => sum + Number(m.gas_deduction_bsk || 0), 0),
        migrations_completed: completed.length,
        migrations_failed: failed.length,
        migrations_pending: pending.length,
        users_with_failures: usersWithFailures,
      });
    } catch (err) {
      console.error('Error fetching global stats:', err);
      toast.error('Failed to fetch statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all users with BSK balance
      const { data: balances, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('user_id, withdrawable_balance, holding_balance')
        .order('withdrawable_balance', { ascending: false })
        .limit(1000);

      if (balanceError) throw balanceError;

      const userIds = balances?.map(b => b.user_id) || [];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username, phone, display_name')
        .in('user_id', userIds);

      // Get all migrations for these users
      const { data: migrations } = await supabase
        .from('bsk_onchain_migrations')
        .select('user_id, status, amount_requested, net_amount_migrated, migration_fee_bsk, gas_deduction_bsk, wallet_address, created_at')
        .in('user_id', userIds);

      // Build summary
      const summary: UserBSKSummary[] = balances?.map(balance => {
        const profile = profiles?.find(p => p.user_id === balance.user_id);
        const userMigrations = migrations?.filter(m => m.user_id === balance.user_id) || [];
        const completed = userMigrations.filter(m => m.status === 'completed');
        const failed = userMigrations.filter(m => ['failed', 'rolled_back'].includes(m.status));
        const pending = userMigrations.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status));

        const sorted = [...userMigrations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
          user_id: balance.user_id,
          email: profile?.email || null,
          username: profile?.username || null,
          phone: profile?.phone || null,
          display_name: profile?.display_name || null,
          withdrawable_balance: Math.max(0, Number(balance.withdrawable_balance)),
          holding_balance: Math.max(0, Number(balance.holding_balance || 0)),
          total_migrated_requested: completed.reduce((sum, m) => sum + Number(m.amount_requested || 0), 0),
          total_migrated_net: completed.reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
          total_fees_paid: completed.reduce((sum, m) => sum + Number(m.migration_fee_bsk || 0) + Number(m.gas_deduction_bsk || 0), 0),
          last_migration_date: sorted.length > 0 ? sorted[0].created_at : null,
          migrations_completed: completed.length,
          migrations_failed: failed.length,
          migrations_pending: pending.length,
          migrations_total: userMigrations.length,
          last_wallet_used: sorted.length > 0 ? sorted[0].wallet_address : null,
          flags: {
            high_balance: Number(balance.withdrawable_balance) >= 10000,
            frequent_failures: failed.length >= 2,
            has_pending: pending.length > 0,
          }
        };
      }) || [];

      setUsers(summary);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStats();
    fetchUsers();
  }, [fetchGlobalStats, fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.user_id.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.display_name?.toLowerCase().includes(query)
      );
    }

    if (minBalance && !isNaN(Number(minBalance))) {
      result = result.filter(u => u.withdrawable_balance >= Number(minBalance));
    }

    if (showOnlyWithMigrations) {
      result = result.filter(u => u.migrations_total > 0);
    }

    if (showOnlyWithFailures) {
      result = result.filter(u => u.migrations_failed > 0);
    }

    return result;
  }, [users, searchQuery, minBalance, showOnlyWithMigrations, showOnlyWithFailures]);

  const exportCSV = () => {
    const headers = ['User ID', 'Username', 'Email', 'Phone', 'Withdrawable BSK', 'Migrated (Net)', 'Fees Paid', 'Completed', 'Failed', 'Last Wallet'];
    const rows = filteredUsers.map(u => [
      u.user_id,
      u.username || '',
      u.email || '',
      u.phone || '',
      u.withdrawable_balance.toFixed(4),
      u.total_migrated_net.toFixed(4),
      u.total_fees_paid.toFixed(4),
      u.migrations_completed,
      u.migrations_failed,
      u.last_wallet_used || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Users_BSK_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMinBalance('');
    setShowOnlyWithMigrations(false);
    setShowOnlyWithFailures(false);
  };

  const hasFilters = searchQuery || minBalance || showOnlyWithMigrations || showOnlyWithFailures;

  return (
    <div className="space-y-4">
      {/* Global Stats - Accurate from migrations table */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-3 sm:p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-16 mb-2" />
              <div className="h-6 bg-muted rounded w-20" />
            </Card>
          ))}
        </div>
      ) : globalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatCard 
            label="Total Users" 
            value={globalStats.total_users_with_balance.toLocaleString()} 
            icon={Users} 
          />
          <StatCard 
            label="Withdrawable BSK" 
            value={formatBSK(globalStats.total_withdrawable_bsk, true)} 
            icon={Wallet}
            color="text-primary"
          />
          <StatCard 
            label="Total Migrated" 
            value={formatBSK(globalStats.total_migrated_net, true)}
            subValue={`${globalStats.migrations_completed} completed`}
            icon={TrendingUp}
            color="text-green-500"
          />
          <StatCard 
            label="Fees Collected" 
            value={formatBSK(globalStats.total_fees_collected + globalStats.total_gas_collected, true)}
            subValue={`Fee: ${formatBSK(globalStats.total_fees_collected, true)} + Gas: ${formatBSK(globalStats.total_gas_collected, true)}`}
            icon={Coins}
            color="text-orange-400"
          />
          <StatCard 
            label="Users w/ Failures" 
            value={globalStats.users_with_failures} 
            subValue={`${globalStats.migrations_failed} total failed`}
            icon={AlertTriangle}
            color="text-red-500"
          />
          <StatCard 
            label="Pending" 
            value={globalStats.migrations_pending} 
            icon={Clock}
            color="text-yellow-500"
          />
        </div>
      )}

      {/* Filters - Sticky */}
      <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10 space-y-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Min:</span>
            <Input
              type="number"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              className="w-20 h-9 text-sm"
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={showOnlyWithMigrations}
              onCheckedChange={(c) => setShowOnlyWithMigrations(!!c)}
            />
            Has migrations
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={showOnlyWithFailures}
              onCheckedChange={(c) => setShowOnlyWithFailures(!!c)}
            />
            Has failures
          </label>
          
          <div className="flex-1" />
          
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs px-2">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchGlobalStats(); fetchUsers(); }} disabled={loading} className="h-7 text-xs px-2">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-xs px-2">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </p>

      {/* User List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <Card
              key={u.user_id}
              className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedUser(u)}
            >
              <div className="flex items-start gap-3">
                {/* Left - User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">
                      {u.display_name || u.username || u.email?.split('@')[0] || 'Unknown'}
                    </span>
                    {u.flags.high_balance && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-[9px] py-0 px-1.5">
                        High
                      </Badge>
                    )}
                    {u.flags.frequent_failures && (
                      <Badge variant="outline" className="text-red-400 border-red-400/50 text-[9px] py-0 px-1.5">
                        Fails
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email || 'No email'}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-mono">
                    <span>ID: {u.user_id.slice(0, 8)}...</span>
                    <CopyButton value={u.user_id} />
                  </div>
                </div>

                {/* Center - Migration Stats */}
                <div className="text-center shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Migrations</p>
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <span className="text-green-500">{u.migrations_completed}✓</span>
                    <span className="text-red-500">{u.migrations_failed}✗</span>
                    {u.migrations_pending > 0 && <span className="text-yellow-500">{u.migrations_pending}⏳</span>}
                  </div>
                </div>

                {/* Right - Balance + Arrow */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="font-bold text-sm text-primary">{formatBSK(u.withdrawable_balance, true)}</p>
                    <p className="text-[10px] text-muted-foreground">BSK remaining</p>
                    {u.total_migrated_net > 0 && (
                      <p className="text-[10px] text-green-500">
                        Migrated: {formatBSK(u.total_migrated_net, true)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      )}

      <UserDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}

// ============= Main Component =============
export default function BSKMigrationAudit() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">BSK Migration Audit</h1>
          <p className="text-sm text-muted-foreground">Complete audit trail for all BSK on-chain migrations</p>
        </div>

        <Tabs defaultValue="users-remaining" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all-migrations" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              All Migrations
            </TabsTrigger>
            <TabsTrigger value="users-remaining" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Users className="w-3.5 h-3.5" />
              Users Remaining BSK
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-migrations">
            <AllMigrationsTab />
          </TabsContent>

          <TabsContent value="users-remaining">
            <UsersRemainingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
