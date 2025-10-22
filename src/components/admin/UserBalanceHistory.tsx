import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BonusLedgerEntry {
  id: string;
  created_at: string;
  type: string;
  amount_bsk: number;
  asset: string;
  meta_json: any;
  usd_value: number;
}

interface UserBalanceHistoryProps {
  userId: string;
}

export function UserBalanceHistory({ userId }: UserBalanceHistoryProps) {
  const [entries, setEntries] = useState<BonusLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bonus_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching BSK history:', error);
      toast.error('Failed to load BSK history');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount BSK', 'Asset', 'Notes', 'USD Value'];
    const rows = entries.map(entry => [
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
      entry.type,
      entry.amount_bsk,
      entry.asset,
      JSON.stringify(entry.meta_json || {}),
      entry.usd_value
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk-history-${userId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('History exported to CSV');
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      badge_purchase: 'bg-red-500/10 text-red-500',
      badge_upgrade: 'bg-orange-500/10 text-orange-500',
      badge_bonus: 'bg-green-500/10 text-green-500',
      referral_badge_purchase: 'bg-blue-500/10 text-blue-500',
      commission: 'bg-purple-500/10 text-purple-500',
      bonus: 'bg-green-500/10 text-green-500',
      withdrawal: 'bg-red-500/10 text-red-500',
      deposit: 'bg-green-500/10 text-green-500',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500';
  };

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading BSK history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>BSK Transaction History</CardTitle>
            <CardDescription>
              Complete history of all BSK transactions for this user
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={entries.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No BSK transactions found for this user
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount BSK</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(entry.type)}>
                        {entry.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${entry.amount_bsk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(entry.amount_bsk)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.asset}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {entry.meta_json && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {entry.meta_json.badge_name && (
                            <div>Badge: <span className="font-medium">{entry.meta_json.badge_name}</span></div>
                          )}
                          {entry.meta_json.bonus_type && (
                            <div>Bonus Type: <span className="font-medium">{entry.meta_json.bonus_type}</span></div>
                          )}
                          {entry.meta_json.note && (
                            <div className="italic">{entry.meta_json.note}</div>
                          )}
                          {entry.meta_json.source && (
                            <div>Source: {entry.meta_json.source}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
