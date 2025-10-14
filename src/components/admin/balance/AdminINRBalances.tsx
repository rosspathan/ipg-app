import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, Plus, Minus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface INRBalance {
  id: string;
  user_id: string;
  balance: number;
  locked: number;
  total_deposited: number;
  total_withdrawn: number;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

const AdminINRBalances = () => {
  const [balances, setBalances] = useState<INRBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<INRBalance | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_inr_balances')
        .select('*')
        .order('balance', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch profiles for each balance
      const balancesWithProfiles = await Promise.all(
        (data || []).map(async (balance) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', balance.user_id)
            .maybeSingle();
          
          return {
            ...balance,
            profiles: profile
          };
        })
      );
      
      setBalances(balancesWithProfiles);
    } catch (error) {
      console.error('Error loading INR balances:', error);
      toast({
        title: "Error",
        description: "Failed to load INR balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchByEmail = async () => {
    if (!searchEmail.trim()) {
      loadBalances();
      return;
    }

    try {
      setLoading(true);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', `%${searchEmail}%`);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        setBalances([]);
        return;
      }

      const userIds = profiles.map(p => p.user_id);
      const { data, error } = await supabase
        .from('user_inr_balances')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      const balancesWithProfiles = await Promise.all(
        (data || []).map(async (balance) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', balance.user_id)
            .maybeSingle();
          
          return {
            ...balance,
            profiles: profile
          };
        })
      );
      
      setBalances(balancesWithProfiles);
    } catch (error) {
      console.error('Error searching balances:', error);
      toast({
        title: "Error",
        description: "Failed to search balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const adjustBalance = async (type: 'add' | 'subtract') => {
    if (!selectedUser || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const newBalance = type === 'add' 
        ? selectedUser.balance + amount 
        : selectedUser.balance - amount;

      if (newBalance < 0) {
        toast({
          title: "Error",
          description: "Balance cannot be negative",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_inr_balances')
        .update({ balance: newBalance })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      // Log the adjustment
      await supabase.rpc('log_admin_action', {
        p_action: `inr_balance_${type}`,
        p_resource_type: 'user_inr_balances',
        p_resource_id: selectedUser.id,
        p_new_values: {
          amount,
          note: adjustNote,
          new_balance: newBalance
        },
      });

      toast({
        title: "Success",
        description: `INR balance adjusted successfully`,
      });

      setSelectedUser(null);
      setAdjustAmount('');
      setAdjustNote('');
      loadBalances();
    } catch (error) {
      console.error('Error adjusting balance:', error);
      toast({
        title: "Error",
        description: "Failed to adjust balance",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-lg md:text-xl">
              INR Balances
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByEmail()}
                  className="w-full md:w-48"
                />
                <Button size="sm" variant="outline" onClick={searchByEmail}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={loadBalances}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="text-right">Available Balance</TableHead>
                  <TableHead className="text-right">Locked</TableHead>
                  <TableHead className="text-right">Total Deposited</TableHead>
                  <TableHead className="text-right">Total Withdrawn</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium truncate">{balance.profiles?.full_name || 'N/A'}</div>
                        <div className="text-muted-foreground text-xs truncate">{balance.profiles?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{balance.balance.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      ₹{balance.locked.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      ₹{balance.total_deposited.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      ₹{balance.total_withdrawn.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedUser(balance)}
                          >
                            Adjust
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Adjust INR Balance</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>User</Label>
                              <p className="text-sm">{balance.profiles?.full_name} ({balance.profiles?.email})</p>
                            </div>
                            <div>
                              <Label>Current Balance</Label>
                              <p className="text-sm font-medium">₹{balance.balance.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <Label>Adjustment Amount</Label>
                              <Input
                                type="number"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                placeholder="Enter amount"
                              />
                            </div>
                            <div>
                              <Label>Note (optional)</Label>
                              <Input
                                value={adjustNote}
                                onChange={(e) => setAdjustNote(e.target.value)}
                                placeholder="Reason for adjustment"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => adjustBalance('subtract')}
                                disabled={!adjustAmount}
                              >
                                <Minus className="mr-2 h-4 w-4" />
                                Subtract
                              </Button>
                              <Button
                                onClick={() => adjustBalance('add')}
                                disabled={!adjustAmount}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {balances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No INR balances found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminINRBalances;
