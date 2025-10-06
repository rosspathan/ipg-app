import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Unlock, ArrowRightLeft } from 'lucide-react';

interface UserBalance {
  user_id: string;
  holding_balance: number;
  withdrawable_balance: number;
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

interface ReleaseHistory {
  id: string;
  user_id: string;
  amount_released: number;
  percentage: number;
  released_by: string;
  created_at: string;
  profiles?: {
    email?: string;
    full_name?: string;
  };
  admin_profiles?: {
    email?: string;
  };
}

export function AdminBSKRelease() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [releasePercentage, setReleasePercentage] = useState(10);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<ReleaseHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    loadBalances();
    loadHistory();
  }, []);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select(`
          user_id,
          holding_balance,
          withdrawable_balance,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .gt('holding_balance', 0)
        .order('holding_balance', { ascending: false });

      if (error) throw error;
      setBalances(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('bsk_release_history')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          ),
          admin_profiles:released_by (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filtered = getFilteredBalances();
      setSelectedUsers(new Set(filtered.map(b => b.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const getFilteredBalances = () => {
    if (!searchEmail) return balances;
    return balances.filter(b => 
      b.profiles?.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
      b.profiles?.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
    );
  };

  const calculateTotalRelease = () => {
    return Array.from(selectedUsers).reduce((sum, userId) => {
      const balance = balances.find(b => b.user_id === userId);
      return sum + (balance ? (balance.holding_balance * releasePercentage / 100) : 0);
    }, 0);
  };

  const handleRelease = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one user',
        variant: 'destructive',
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const executeRelease = async () => {
    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const releases = Array.from(selectedUsers).map(userId => {
        const balance = balances.find(b => b.user_id === userId);
        if (!balance) return null;
        
        const releaseAmount = balance.holding_balance * releasePercentage / 100;
        return {
          user_id: userId,
          holding_before: balance.holding_balance,
          withdrawable_before: balance.withdrawable_balance,
          release_amount: releaseAmount,
          percentage: releasePercentage,
        };
      }).filter(Boolean);

      // Execute releases in parallel
      const promises = releases.map(async (release) => {
        if (!release) return;

        // Update balance
        const { error: updateError } = await supabase
          .from('user_bsk_balances')
          .update({
            holding_balance: release.holding_before - release.release_amount,
            withdrawable_balance: release.withdrawable_before + release.release_amount,
          })
          .eq('user_id', release.user_id);

        if (updateError) throw updateError;

        // Record history
        const { error: historyError } = await supabase
          .from('bsk_release_history')
          .insert({
            user_id: release.user_id,
            amount_released: release.release_amount,
            percentage: release.percentage,
            holding_before: release.holding_before,
            withdrawable_before: release.withdrawable_before,
            holding_after: release.holding_before - release.release_amount,
            withdrawable_after: release.withdrawable_before + release.release_amount,
            released_by: user.id,
          });

        if (historyError) throw historyError;

        // Create ledger entry
        await supabase
          .from('bsk_withdrawable_ledger')
          .insert({
            user_id: release.user_id,
            amount_bsk: release.release_amount,
            amount_inr: 0,
            rate_snapshot: 1,
            tx_type: 'admin_release',
            tx_subtype: 'holding_to_withdrawable',
            balance_before: release.withdrawable_before,
            balance_after: release.withdrawable_before + release.release_amount,
            notes: `Admin released ${release.percentage}% of holding balance`,
          });
      });

      await Promise.all(promises);

      toast({
        title: 'Success',
        description: `Released ${releasePercentage}% for ${selectedUsers.size} user(s)`,
      });

      setIsConfirmOpen(false);
      setSelectedUsers(new Set());
      await loadBalances();
      await loadHistory();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBalances = getFilteredBalances();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            BSK Release Management
          </CardTitle>
          <CardDescription>
            Release holding BSK to withdrawable BSK for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Search User</Label>
              <Input
                placeholder="Search by email or name..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Release Percentage: {releasePercentage}%</Label>
              <Slider
                value={[releasePercentage]}
                onValueChange={(value) => setReleasePercentage(value[0])}
                min={1}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedUsers.size > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p className="text-sm font-medium">Release Summary</p>
              <p className="text-sm text-muted-foreground">
                Selected Users: {selectedUsers.size}
              </p>
              <p className="text-sm text-muted-foreground">
                Total BSK to Release: {calculateTotalRelease().toFixed(2)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRelease}
              disabled={selectedUsers.size === 0 || isProcessing}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Release BSK
            </Button>
            <Button
              variant="outline"
              onClick={loadBalances}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>

          {/* Balances Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === filteredBalances.length && filteredBalances.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Holding BSK</TableHead>
                  <TableHead className="text-right">Withdrawable BSK</TableHead>
                  <TableHead className="text-right">To Release</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No users with holding balance
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBalances.map((balance) => {
                    const releaseAmount = balance.holding_balance * releasePercentage / 100;
                    return (
                      <TableRow key={balance.user_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(balance.user_id)}
                            onCheckedChange={(checked) => 
                              handleSelectUser(balance.user_id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {balance.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{balance.profiles?.email || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {balance.holding_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {balance.withdrawable_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {releaseAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Release History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Release History</CardTitle>
            <CardDescription>Recent BSK releases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount Released</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Released By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No release history
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {record.profiles?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{record.amount_released.toFixed(2)}</TableCell>
                        <TableCell>{record.percentage}%</TableCell>
                        <TableCell>
                          {record.admin_profiles?.email || 'Admin'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm BSK Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to release {releasePercentage}% of holding BSK for {selectedUsers.size} user(s)?
              Total amount: {calculateTotalRelease().toFixed(2)} BSK
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeRelease}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
