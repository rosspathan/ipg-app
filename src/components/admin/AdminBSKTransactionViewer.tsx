import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UnifiedBSKHistory } from '@/components/bsk/UnifiedBSKHistory';
import { Search, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AdminBSKTransactionViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['admin-user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Reconcile balance function
  const handleReconcileBalance = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('reconcile_bsk_balance', {
        p_user_id: userId,
      });

      if (error) throw error;
      setReconciliationResult(data);
    } catch (error) {
      console.error('Reconciliation error:', error);
      setReconciliationResult({
        error: 'Failed to reconcile balance',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">User Search</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Search by email or username to view a specific user's transaction history
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="user-search">Search User</Label>
              <Input
                id="user-search"
                placeholder="Email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="mt-auto"
              disabled={isSearching}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      setSelectedUserId(user.user_id);
                      setSearchQuery('');
                      setReconciliationResult(null);
                    }}
                  >
                    <div>
                      <p className="font-medium">{user.display_name || 'No Name'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected User Info */}
          {selectedUserId && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Viewing User</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {selectedUserId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReconcileBalance(selectedUserId)}
                  >
                    Reconcile Balance
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUserId(null);
                      setReconciliationResult(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Reconciliation Result */}
          {reconciliationResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Balance Reconciliation Result:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-muted-foreground">Withdrawable:</p>
                      <p>
                        Ledger: {reconciliationResult.ledger_withdrawable} BSK{' '}
                        {reconciliationResult.withdrawable_match ? '✓' : '✗'}
                      </p>
                      <p>Balance: {reconciliationResult.balance_withdrawable} BSK</p>
                      {!reconciliationResult.withdrawable_match && (
                        <p className="text-destructive">
                          Diff: {reconciliationResult.withdrawable_diff} BSK
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Holding:</p>
                      <p>
                        Ledger: {reconciliationResult.ledger_holding} BSK{' '}
                        {reconciliationResult.holding_match ? '✓' : '✗'}
                      </p>
                      <p>Balance: {reconciliationResult.balance_holding} BSK</p>
                      {!reconciliationResult.holding_match && (
                        <p className="text-destructive">
                          Diff: {reconciliationResult.holding_diff} BSK
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {selectedUserId ? 'User Transaction History' : 'All Transactions'}
        </h3>
        <UnifiedBSKHistory userId={selectedUserId || undefined} />
      </div>
    </div>
  );
}
