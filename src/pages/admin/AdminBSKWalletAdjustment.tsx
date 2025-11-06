import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Minus, Wallet, History, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { format } from 'date-fns';

interface UserBalance {
  user_id: string;
  email: string;
  full_name: string;
  holding_balance: number;
  withdrawable_balance: number;
  total_balance: number;
}

interface AdjustmentHistory {
  id: string;
  user_id: string;
  amount_bsk: number;
  balance_type: string;
  operation: string;
  notes: string;
  admin_email: string;
  created_at: string;
}

export default function AdminBSKWalletAdjustment() {
  const { user: adminUser } = useAuthUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null);
  const [balanceType, setBalanceType] = useState<'holding' | 'withdrawable'>('withdrawable');
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['admin-user-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          full_name,
          user_bsk_balances (
            holding_balance,
            withdrawable_balance
          )
        `)
        .limit(10);

      if (searchTerm.includes('@')) {
        query = query.ilike('email', `%${searchTerm}%`);
      } else {
        query = query.or(`user_id.eq.${searchTerm},email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      return data?.map((user: any) => ({
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name || 'N/A',
        holding_balance: user.user_bsk_balances?.[0]?.holding_balance || 0,
        withdrawable_balance: user.user_bsk_balances?.[0]?.withdrawable_balance || 0,
        total_balance: (user.user_bsk_balances?.[0]?.holding_balance || 0) + (user.user_bsk_balances?.[0]?.withdrawable_balance || 0)
      })) || [];
    },
    enabled: searchTerm.length >= 2
  });

  // Get adjustment history
  const { data: adjustmentHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['bsk-adjustment-history', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];

      const { data: holdingData } = await supabase
        .from('bsk_holding_ledger')
        .select(`
          id,
          user_id,
          amount_bsk,
          tx_type,
          notes,
          created_at,
          created_by
        `)
        .eq('user_id', selectedUser.user_id)
        .eq('tx_type', 'admin_adjustment')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: withdrawableData } = await supabase
        .from('bsk_withdrawable_ledger')
        .select(`
          id,
          user_id,
          amount_bsk,
          tx_type,
          notes,
          created_at,
          created_by
        `)
        .eq('user_id', selectedUser.user_id)
        .eq('tx_type', 'admin_adjustment')
        .order('created_at', { ascending: false })
        .limit(20);

      const combined = [
        ...(holdingData || []).map(entry => ({ ...entry, balance_type: 'holding' })),
        ...(withdrawableData || []).map(entry => ({ ...entry, balance_type: 'withdrawable' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Get admin emails
      const adminIds = [...new Set(combined.map(e => e.created_by).filter(Boolean))];
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', adminIds);

      const adminEmailMap = new Map(adminProfiles?.map(p => [p.user_id, p.email]) || []);

      return combined.map(entry => ({
        id: entry.id,
        user_id: entry.user_id,
        amount_bsk: entry.amount_bsk,
        balance_type: entry.balance_type,
        operation: entry.amount_bsk >= 0 ? 'add' : 'remove',
        notes: entry.notes || 'N/A',
        admin_email: adminEmailMap.get(entry.created_by) || 'System',
        created_at: entry.created_at
      }));
    },
    enabled: !!selectedUser
  });

  // Adjust balance mutation
  const adjustBalance = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !amount || !notes) {
        throw new Error('Missing required fields');
      }

      const adjustmentAmount = parseFloat(amount);
      if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const finalAmount = operation === 'remove' ? -adjustmentAmount : adjustmentAmount;
      const tableName = balanceType === 'holding' ? 'bsk_holding_ledger' : 'bsk_withdrawable_ledger';

      // Get current balance
      const { data: currentBalance } = await supabase
        .from('user_bsk_balances')
        .select(`${balanceType}_balance`)
        .eq('user_id', selectedUser.user_id)
        .single();

      const balanceBefore = currentBalance?.[`${balanceType}_balance`] || 0;
      const balanceAfter = balanceBefore + finalAmount;

      // Check if removal would result in negative balance
      if (operation === 'remove' && balanceAfter < 0) {
        throw new Error(`Insufficient balance. Current: ${balanceBefore} BSK, Trying to remove: ${adjustmentAmount} BSK`);
      }

      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from(tableName)
        .insert({
          user_id: selectedUser.user_id,
          amount_bsk: finalAmount,
          amount_inr: 0,
          rate_snapshot: 0,
          tx_type: 'admin_adjustment',
          tx_subtype: operation === 'add' ? 'manual_credit' : 'manual_debit',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          notes: `Admin adjustment by ${adminUser?.email || 'admin'}: ${notes}`,
          metadata: {
            admin_id: adminUser?.id,
            admin_email: adminUser?.email,
            operation: operation,
            reason: notes
          },
          created_by: adminUser?.id
        });

      if (ledgerError) throw ledgerError;

      // Update user balance
      const { error: balanceError } = await supabase
        .from('user_bsk_balances')
        .upsert({
          user_id: selectedUser.user_id,
          [`${balanceType}_balance`]: balanceAfter,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (balanceError) throw balanceError;

      return { balanceAfter };
    },
    onSuccess: (data) => {
      toast({
        title: "Balance Adjusted Successfully",
        description: `${operation === 'add' ? 'Added' : 'Removed'} ${amount} BSK ${operation === 'add' ? 'to' : 'from'} ${balanceType} balance. New balance: ${data.balanceAfter.toFixed(2)} BSK`
      });

      // Reset form
      setAmount('');
      setNotes('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-user-search'] });
      queryClient.invalidateQueries({ queryKey: ['bsk-adjustment-history'] });
      
      // Refresh selected user data
      if (selectedUser) {
        const updatedUser = { ...selectedUser };
        if (balanceType === 'holding') {
          updatedUser.holding_balance = data.balanceAfter;
        } else {
          updatedUser.withdrawable_balance = data.balanceAfter;
        }
        updatedUser.total_balance = updatedUser.holding_balance + updatedUser.withdrawable_balance;
        setSelectedUser(updatedUser);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Adjustment Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAdjustment = async () => {
    if (!selectedUser || !amount || !notes) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await adjustBalance.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">BSK Wallet Adjustment</h1>
        <p className="text-muted-foreground mt-2">
          Add or remove BSK from any user's wallet with instant balance updates
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Admin Control:</strong> All adjustments are logged and will create proper ledger entries. 
          Balances update instantly. Use this tool responsibly.
        </AlertDescription>
      </Alert>

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search User
          </CardTitle>
          <CardDescription>Search by email, user ID, or name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter email, user ID, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isSearching && (
            <div className="text-sm text-muted-foreground">Searching...</div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Search Results:</p>
              <div className="border rounded-lg divide-y">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedUser?.user_id === user.user_id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.full_name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{user.user_id.substring(0, 8)}...</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Total: {user.total_balance.toFixed(2)} BSK</p>
                        <p className="text-xs text-muted-foreground">Holding: {user.holding_balance.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Withdrawable: {user.withdrawable_balance.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchTerm && !isSearching && searchResults?.length === 0 && (
            <Alert>
              <AlertDescription>No users found matching your search.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Form */}
      {selectedUser && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Current Balance - {selectedUser.email}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Holding Balance</p>
                  <p className="text-2xl font-bold">{selectedUser.holding_balance.toFixed(2)} BSK</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Withdrawable Balance</p>
                  <p className="text-2xl font-bold">{selectedUser.withdrawable_balance.toFixed(2)} BSK</p>
                </div>
                <div className="p-4 border rounded-lg bg-primary/5">
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold">{selectedUser.total_balance.toFixed(2)} BSK</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Make Adjustment</CardTitle>
              <CardDescription>Add or remove BSK from user's wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Balance Type</Label>
                  <Select value={balanceType} onValueChange={(value: 'holding' | 'withdrawable') => setBalanceType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holding">Holding Balance</SelectItem>
                      <SelectItem value="withdrawable">Withdrawable Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Operation</Label>
                  <Select value={operation} onValueChange={(value: 'add' | 'remove') => setOperation(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add BSK
                        </div>
                      </SelectItem>
                      <SelectItem value="remove">
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4" />
                          Remove BSK
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (BSK)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reason / Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  id="notes"
                  placeholder="Explain why this adjustment is being made (required for audit trail)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                  required
                />
              </div>

              {amount && parseFloat(amount) > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Preview:</strong> Will {operation} <strong>{parseFloat(amount).toFixed(2)} BSK</strong> {operation === 'add' ? 'to' : 'from'} <strong>{balanceType}</strong> balance.
                    <br />
                    New balance will be: <strong>
                      {(operation === 'add' 
                        ? (balanceType === 'holding' ? selectedUser.holding_balance + parseFloat(amount) : selectedUser.withdrawable_balance + parseFloat(amount))
                        : (balanceType === 'holding' ? selectedUser.holding_balance - parseFloat(amount) : selectedUser.withdrawable_balance - parseFloat(amount))
                      ).toFixed(2)} BSK
                    </strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleAdjustment}
                disabled={!amount || !notes || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {operation === 'add' ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                    {operation === 'add' ? 'Add' : 'Remove'} {amount || '0'} BSK
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Adjustment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Adjustment History
              </CardTitle>
              <CardDescription>Recent admin adjustments for this user</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-4 text-muted-foreground">Loading history...</div>
              ) : adjustmentHistory && adjustmentHistory.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Balance Type</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.balance_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.operation === 'add' ? 'default' : 'destructive'}>
                              {entry.operation === 'add' ? 'Added' : 'Removed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={entry.amount_bsk >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {entry.amount_bsk >= 0 ? '+' : ''}{entry.amount_bsk.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{entry.admin_email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {entry.notes}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No adjustment history found for this user
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
