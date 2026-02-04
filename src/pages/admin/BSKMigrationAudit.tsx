import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  User,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Eye,
  FileSpreadsheet,
  Calendar,
  Wallet,
  TrendingUp,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Status configuration
const statusColors: Record<string, string> = {
  created: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  validated: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  debited: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  signed: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  broadcasted: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  failed: 'bg-red-500/20 text-red-400 border-red-500/50',
  refunded: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  rolled_back: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  refunded: <ArrowRightLeft className="w-4 h-4 text-cyan-400" />,
  rolled_back: <ArrowRightLeft className="w-4 h-4 text-gray-400" />,
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  broadcasted: <Clock className="w-4 h-4 text-orange-400" />,
};

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
  total_migrated_requested: number;
  total_migrated_net: number;
  total_fees_paid: number;
  last_migration_date: string | null;
  migrations_completed: number;
  migrations_failed: number;
  migrations_total: number;
  last_wallet_used: string | null;
  flags: {
    high_balance: boolean;
    frequent_failures: boolean;
    mismatch_detected: boolean;
  };
}

interface AuditStats {
  total_users: number;
  total_withdrawable_bsk: number;
  total_migrated_bsk: number;
  total_fees_collected: number;
  failed_count: number;
  pending_count: number;
  completed_count: number;
}

// Copy button helper
function CopyButton({ value, label }: { value: string; label?: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success(label ? `${label} copied` : 'Copied to clipboard');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard();
      }}
    >
      <Copy className="h-3 w-3" />
    </Button>
  );
}

// All Migrations Tab Component
function AllMigrationsTab() {
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMigration, setSelectedMigration] = useState<MigrationRecord | null>(null);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchMigrations = async () => {
    setLoading(true);
    try {
      // Fetch migrations
      const { data: migrationsData, error } = await supabase
        .from('bsk_onchain_migrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(migrationsData?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username, phone, display_name')
        .in('user_id', userIds);

      // Merge data
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
  };

  useEffect(() => {
    fetchMigrations();
  }, []);

  // Filter and sort migrations
  const filteredMigrations = useMemo(() => {
    let result = [...migrations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.user_id.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query) ||
        m.user?.username?.toLowerCase().includes(query) ||
        m.user?.phone?.toLowerCase().includes(query) ||
        m.wallet_address?.toLowerCase().includes(query) ||
        m.tx_hash?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'failed') {
        result = result.filter(m => ['failed', 'rolled_back'].includes(m.status));
      } else if (statusFilter === 'pending') {
        result = result.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status));
      } else {
        result = result.filter(m => m.status === statusFilter);
      }
    }

    // Date filters
    if (dateFrom) {
      result = result.filter(m => new Date(m.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(m => new Date(m.created_at) <= endDate);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'amount_requested':
          aVal = Number(a.amount_requested);
          bVal = Number(b.amount_requested);
          break;
        case 'net_amount_migrated':
          aVal = Number(a.net_amount_migrated);
          bVal = Number(b.net_amount_migrated);
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [migrations, searchQuery, statusFilter, dateFrom, dateTo, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => ({
    total: migrations.length,
    completed: migrations.filter(m => m.status === 'completed').length,
    failed: migrations.filter(m => ['failed', 'rolled_back'].includes(m.status)).length,
    pending: migrations.filter(m => !['completed', 'failed', 'rolled_back', 'refunded'].includes(m.status)).length,
    refunded: migrations.filter(m => m.status === 'refunded' || m.refunded_at).length,
    totalBsk: migrations.filter(m => m.status === 'completed').reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
    totalFees: migrations.filter(m => m.status === 'completed').reduce((sum, m) => sum + Number(m.migration_fee_bsk || 0) + Number(m.gas_deduction_bsk || 0), 0),
  }), [migrations]);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Date/Time', 'Request ID', 'User ID', 'Username', 'Email', 'Phone',
      'Amount Requested (BSK)', 'Migration Fee (BSK)', 'Gas Fee (BSK)', 'Net Received (BSK)',
      'Destination Wallet', 'Status', 'Tx Hash', 'Block Number', 'Error/Notes'
    ];
    
    const rows = filteredMigrations.map(m => [
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm:ss'),
      m.id,
      m.user_id,
      m.user?.username || '',
      m.user?.email || '',
      m.user?.phone || '',
      Number(m.amount_requested).toFixed(8),
      Number(m.migration_fee_bsk || 0).toFixed(8),
      Number(m.gas_deduction_bsk || 0).toFixed(8),
      Number(m.net_amount_migrated || 0).toFixed(8),
      m.wallet_address,
      m.status,
      m.tx_hash || '',
      m.block_number || '',
      m.error_message || m.admin_notes || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BSK_Migrations_Audit_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('completed')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('failed')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalBsk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">BSK Migrated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-400">{stats.totalFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fees Collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, wallet, tx hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
                placeholder="To"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchMigrations} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredMigrations.length} of {migrations.length} migrations
      </div>

      {/* Migrations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filteredMigrations.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedMigration(m)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left - User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {m.user?.display_name || m.user?.username || m.user?.email || 'Unknown'}
                          </span>
                          <Badge className={cn("text-xs", statusColors[m.status])}>
                            {m.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span>Email: {m.user?.email || 'N/A'}</span>
                            {m.user?.phone && <span>• {m.user.phone}</span>}
                          </div>
                          <div className="font-mono flex items-center gap-1">
                            <span>Wallet: {m.wallet_address?.slice(0, 10)}...{m.wallet_address?.slice(-6)}</span>
                            <CopyButton value={m.wallet_address} label="Wallet" />
                          </div>
                        </div>
                      </div>

                      {/* Right - Amounts */}
                      <div className="text-right space-y-0.5">
                        <div className="font-bold">{Number(m.amount_requested).toLocaleString()} BSK</div>
                        <div className="text-sm text-muted-foreground">
                          Fee: -{Number(m.migration_fee_bsk || 0).toFixed(2)} BSK ({m.migration_fee_percent || 0}%)
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Gas: -{Number(m.gas_deduction_bsk || 0).toFixed(4)} BSK
                        </div>
                        {m.status === 'completed' && (
                          <div className="text-sm text-green-500 font-medium">
                            Net: {Number(m.net_amount_migrated).toLocaleString()} BSK
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                      <span>{format(new Date(m.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                      <div className="flex items-center gap-3">
                        {m.tx_hash && (
                          <a
                            href={`https://bscscan.com/tx/${m.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View TX <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {m.block_number && (
                          <span>Block: {m.block_number}</span>
                        )}
                        {m.error_message && (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMigrations.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No migrations found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedMigration} onOpenChange={() => setSelectedMigration(null)}>
        <SheetContent className="w-[500px] sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Migration Details</SheetTitle>
            <SheetDescription>
              Full breakdown and audit trail
            </SheetDescription>
          </SheetHeader>
          
          {selectedMigration && (
            <div className="space-y-6 mt-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge className={cn("text-sm px-3 py-1", statusColors[selectedMigration.status])}>
                  {statusIcons[selectedMigration.status]} {selectedMigration.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedMigration.created_at), 'MMM d, yyyy HH:mm:ss')}
                </span>
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">USER</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span>{selectedMigration.user?.display_name || selectedMigration.user?.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedMigration.user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{selectedMigration.user?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">User ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{selectedMigration.user_id.slice(0, 8)}...</span>
                      <CopyButton value={selectedMigration.user_id} label="User ID" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">AMOUNTS</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Requested</span>
                    <span className="font-medium">{Number(selectedMigration.amount_requested).toLocaleString()} BSK</span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span>Migration Fee ({selectedMigration.migration_fee_percent || 0}%)</span>
                    <span>-{Number(selectedMigration.migration_fee_bsk || 0).toFixed(4)} BSK</span>
                  </div>
                  <div className="flex justify-between text-orange-400">
                    <span>Gas Fee</span>
                    <span>-{Number(selectedMigration.gas_deduction_bsk || 0).toFixed(4)} BSK</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-green-400">
                    <span>Net Received</span>
                    <span>{Number(selectedMigration.net_amount_migrated || 0).toLocaleString()} BSK</span>
                  </div>
                </div>
              </div>

              {/* Wallet & TX */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">BLOCKCHAIN</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Destination</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{selectedMigration.wallet_address?.slice(0, 10)}...{selectedMigration.wallet_address?.slice(-6)}</span>
                      <CopyButton value={selectedMigration.wallet_address} label="Wallet" />
                    </div>
                  </div>
                  {selectedMigration.tx_hash && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tx Hash</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://bscscan.com/tx/${selectedMigration.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {selectedMigration.tx_hash.slice(0, 10)}...{selectedMigration.tx_hash.slice(-6)}
                        </a>
                        <CopyButton value={selectedMigration.tx_hash} label="Tx Hash" />
                      </div>
                    </div>
                  )}
                  {selectedMigration.block_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Block</span>
                      <span>{selectedMigration.block_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">TIMELINE</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(selectedMigration.created_at), 'MMM d, HH:mm:ss')}</span>
                  </div>
                  {selectedMigration.validated_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validated</span>
                      <span>{format(new Date(selectedMigration.validated_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.debited_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Debited</span>
                      <span>{format(new Date(selectedMigration.debited_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.broadcasted_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broadcasted</span>
                      <span>{format(new Date(selectedMigration.broadcasted_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.confirmed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmed</span>
                      <span>{format(new Date(selectedMigration.confirmed_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.completed_at && (
                    <div className="flex justify-between text-green-400">
                      <span>Completed</span>
                      <span>{format(new Date(selectedMigration.completed_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.failed_at && (
                    <div className="flex justify-between text-red-400">
                      <span>Failed</span>
                      <span>{format(new Date(selectedMigration.failed_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                  {selectedMigration.refunded_at && (
                    <div className="flex justify-between text-cyan-400">
                      <span>Refunded</span>
                      <span>{format(new Date(selectedMigration.refunded_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Internal References */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">INTERNAL</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Request ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{selectedMigration.id.slice(0, 8)}...</span>
                      <CopyButton value={selectedMigration.id} label="Request ID" />
                    </div>
                  </div>
                  {selectedMigration.ledger_debit_tx_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ledger Tx ID</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{selectedMigration.ledger_debit_tx_id.slice(0, 8)}...</span>
                        <CopyButton value={selectedMigration.ledger_debit_tx_id} label="Ledger ID" />
                      </div>
                    </div>
                  )}
                  {selectedMigration.idempotency_key && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Idempotency Key</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs truncate max-w-[180px]">{selectedMigration.idempotency_key}</span>
                        <CopyButton value={selectedMigration.idempotency_key} label="Key" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Snapshot</span>
                    <span>{Number(selectedMigration.internal_balance_snapshot).toLocaleString()} BSK</span>
                  </div>
                </div>
              </div>

              {/* Error / Notes */}
              {(selectedMigration.error_message || selectedMigration.admin_notes) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">NOTES</h4>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                    {selectedMigration.error_message && (
                      <div className="text-red-400">
                        <span className="font-medium">Error: </span>
                        {selectedMigration.error_message}
                      </div>
                    )}
                    {selectedMigration.admin_notes && (
                      <div className="text-muted-foreground">
                        {selectedMigration.admin_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flags / Warnings */}
              {selectedMigration.status === 'completed' && !selectedMigration.tx_hash && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Completed but missing tx_hash - needs investigation</span>
                  </div>
                </div>
              )}
              {selectedMigration.status === 'broadcasted' && !selectedMigration.tx_hash && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Broadcasted but no tx_hash recorded - critical issue</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Users Remaining BSK Tab Component
function UsersRemainingTab() {
  const [users, setUsers] = useState<UserBSKSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [showOnlyWithMigrations, setShowOnlyWithMigrations] = useState(false);
  const [showOnlyWithFailures, setShowOnlyWithFailures] = useState(false);
  const [sortField, setSortField] = useState<string>('withdrawable_balance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchUsersSummary = async () => {
    setLoading(true);
    try {
      // 1. Get all user BSK balances
      const { data: balances, error: balanceError } = await supabase
        .from('user_bsk_balances')
        .select('user_id, withdrawable_balance, holding_balance')
        .gt('withdrawable_balance', 0.01)
        .order('withdrawable_balance', { ascending: false });

      if (balanceError) throw balanceError;

      const userIds = balances?.map(b => b.user_id) || [];

      // 2. Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username, phone, display_name')
        .in('user_id', userIds);

      // 3. Get migration stats per user
      const { data: migrations } = await supabase
        .from('bsk_onchain_migrations')
        .select('user_id, status, amount_requested, net_amount_migrated, migration_fee_bsk, gas_deduction_bsk, wallet_address, created_at')
        .in('user_id', userIds);

      // 4. Build summary
      const summary: UserBSKSummary[] = balances?.map(balance => {
        const profile = profiles?.find(p => p.user_id === balance.user_id);
        const userMigrations = migrations?.filter(m => m.user_id === balance.user_id) || [];
        const completedMigrations = userMigrations.filter(m => m.status === 'completed');
        const failedMigrations = userMigrations.filter(m => ['failed', 'rolled_back'].includes(m.status));

        return {
          user_id: balance.user_id,
          email: profile?.email || null,
          username: profile?.username || null,
          phone: profile?.phone || null,
          display_name: profile?.display_name || null,
          withdrawable_balance: Number(balance.withdrawable_balance),
          total_migrated_requested: completedMigrations.reduce((sum, m) => sum + Number(m.amount_requested || 0), 0),
          total_migrated_net: completedMigrations.reduce((sum, m) => sum + Number(m.net_amount_migrated || 0), 0),
          total_fees_paid: completedMigrations.reduce((sum, m) => sum + Number(m.migration_fee_bsk || 0) + Number(m.gas_deduction_bsk || 0), 0),
          last_migration_date: userMigrations.length > 0 
            ? userMigrations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
            : null,
          migrations_completed: completedMigrations.length,
          migrations_failed: failedMigrations.length,
          migrations_total: userMigrations.length,
          last_wallet_used: userMigrations.length > 0
            ? userMigrations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].wallet_address
            : null,
          flags: {
            high_balance: Number(balance.withdrawable_balance) >= 10000,
            frequent_failures: failedMigrations.length >= 2,
            mismatch_detected: false, // Would need ledger reconciliation to detect
          }
        };
      }) || [];

      setUsers(summary);
    } catch (err) {
      console.error('Error fetching user summary:', err);
      toast.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersSummary();
  }, []);

  // Filter and sort
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.user_id.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
      );
    }

    // Min balance
    if (minBalance && !isNaN(Number(minBalance))) {
      result = result.filter(u => u.withdrawable_balance >= Number(minBalance));
    }

    // Filters
    if (showOnlyWithMigrations) {
      result = result.filter(u => u.migrations_total > 0);
    }
    if (showOnlyWithFailures) {
      result = result.filter(u => u.migrations_failed > 0);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'total_migrated_net':
          aVal = a.total_migrated_net;
          bVal = b.total_migrated_net;
          break;
        case 'migrations_total':
          aVal = a.migrations_total;
          bVal = b.migrations_total;
          break;
        default:
          aVal = a.withdrawable_balance;
          bVal = b.withdrawable_balance;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [users, searchQuery, minBalance, showOnlyWithMigrations, showOnlyWithFailures, sortField, sortDir]);

  // Stats
  const stats = useMemo<AuditStats>(() => ({
    total_users: users.length,
    total_withdrawable_bsk: users.reduce((sum, u) => sum + u.withdrawable_balance, 0),
    total_migrated_bsk: users.reduce((sum, u) => sum + u.total_migrated_net, 0),
    total_fees_collected: users.reduce((sum, u) => sum + u.total_fees_paid, 0),
    failed_count: users.filter(u => u.migrations_failed > 0).length,
    pending_count: 0,
    completed_count: users.filter(u => u.migrations_completed > 0).length,
  }), [users]);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'User ID', 'Username', 'Email', 'Phone',
      'Withdrawable BSK (Remaining)', 'Total Migrated (Net)', 'Total Migrated (Requested)',
      'Total Fees Paid', 'Migrations Completed', 'Migrations Failed', 'Migrations Total',
      'Last Migration Date', 'Last Wallet Used', 'Flags'
    ];

    const rows = filteredUsers.map(u => [
      u.user_id,
      u.username || '',
      u.email || '',
      u.phone || '',
      u.withdrawable_balance.toFixed(8),
      u.total_migrated_net.toFixed(8),
      u.total_migrated_requested.toFixed(8),
      u.total_fees_paid.toFixed(8),
      u.migrations_completed,
      u.migrations_failed,
      u.migrations_total,
      u.last_migration_date ? format(new Date(u.last_migration_date), 'yyyy-MM-dd HH:mm') : '',
      u.last_wallet_used || '',
      [
        u.flags.high_balance ? 'HIGH_BALANCE' : '',
        u.flags.frequent_failures ? 'FREQUENT_FAILURES' : '',
        u.flags.mismatch_detected ? 'MISMATCH' : ''
      ].filter(Boolean).join(', ')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BSK_Users_Summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Withdrawable BSK</span>
            </div>
            <div className="text-2xl font-bold text-primary">{stats.total_withdrawable_bsk.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Total Migrated</span>
            </div>
            <div className="text-2xl font-bold text-green-500">{stats.total_migrated_bsk.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Fees Collected</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.total_fees_collected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Users w/ Failures</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{stats.failed_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min BSK:</span>
              <Input
                type="number"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                className="w-[100px]"
                placeholder="0"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithMigrations}
                onChange={(e) => setShowOnlyWithMigrations(e.target.checked)}
                className="rounded"
              />
              Has migrations
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithFailures}
                onChange={(e) => setShowOnlyWithFailures(e.target.checked)}
                className="rounded"
              />
              Has failures
            </label>
            <Button variant="outline" size="sm" onClick={fetchUsersSummary} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <div key={u.user_id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left - User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {u.display_name || u.username || u.email || 'Unknown'}
                          </span>
                          {u.flags.high_balance && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                              High Balance
                            </Badge>
                          )}
                          {u.flags.frequent_failures && (
                            <Badge variant="outline" className="text-red-400 border-red-400/50 text-xs">
                              Frequent Failures
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>{u.email || 'No email'} {u.phone && `• ${u.phone}`}</div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono">ID: {u.user_id.slice(0, 8)}...</span>
                            <CopyButton value={u.user_id} label="User ID" />
                          </div>
                        </div>
                      </div>

                      {/* Center - Migration Stats */}
                      <div className="text-center space-y-0.5">
                        <div className="text-sm text-muted-foreground">Migrations</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">{u.migrations_completed} ✓</span>
                          <span className="text-red-500">{u.migrations_failed} ✗</span>
                          <span className="text-muted-foreground">/ {u.migrations_total}</span>
                        </div>
                        {u.last_migration_date && (
                          <div className="text-xs text-muted-foreground">
                            Last: {format(new Date(u.last_migration_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>

                      {/* Right - Balances */}
                      <div className="text-right space-y-0.5">
                        <div className="font-bold text-primary">
                          {u.withdrawable_balance.toLocaleString()} BSK
                        </div>
                        <div className="text-xs text-muted-foreground">Remaining (Withdrawable)</div>
                        {u.total_migrated_net > 0 && (
                          <div className="text-sm text-green-500">
                            Migrated: {u.total_migrated_net.toLocaleString()} BSK
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Last Wallet */}
                    {u.last_wallet_used && (
                      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>Last wallet: </span>
                        <div className="flex items-center gap-1 font-mono">
                          {u.last_wallet_used.slice(0, 10)}...{u.last_wallet_used.slice(-6)}
                          <CopyButton value={u.last_wallet_used} label="Wallet" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found matching your criteria
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

// Main Component
export default function BSKMigrationAudit() {
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">BSK Migration Audit</h1>
          <p className="text-muted-foreground">Complete audit trail for all BSK on-chain migrations</p>
        </div>
      </div>

      <Tabs defaultValue="all-migrations" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all-migrations" className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            All Migrations
          </TabsTrigger>
          <TabsTrigger value="users-remaining" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
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
  );
}
