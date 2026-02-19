import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, DollarSign, Users, FileText, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { generateUserBskReportPDF } from "@/lib/generateUserBskReport";
import { useToast } from "@/hooks/use-toast";

export default function FinancialReports() {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-reports', dateRange],
    queryFn: async () => {
      const today = new Date();
      let startDate = new Date();
      
      switch(dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = startOfMonth(today);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1);
          break;
      }

      const { data: inrDeposits } = await supabase
        .from('fiat_deposits')
        .select('amount')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'approved');

      const { data: inrWithdrawals } = await supabase
        .from('fiat_withdrawals')
        .select('amount')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'approved');

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const depositVolume = (inrDeposits || []).reduce((sum, d) => sum + Number(d.amount), 0);
      const withdrawalVolume = (inrWithdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);

      return {
        depositVolume,
        withdrawalVolume,
        netFlow: depositVolume - withdrawalVolume,
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        transactionCount: (inrDeposits?.length || 0) + (inrWithdrawals?.length || 0)
    };
    }
  });

  const handleDownloadBskPdf = async (minWithdrawable = 0) => {
    setGeneratingPdf(true);
    try {
      const queryParams = minWithdrawable > 0 ? `?min_withdrawable=${minWithdrawable}` : '';
      const { data, error } = await supabase.functions.invoke(`admin-user-bsk-report${queryParams}`);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch report data');
      generateUserBskReportPDF(data.data, data.generated_at);
      toast({ title: 'Report Generated', description: `PDF with ${data.total_users} users downloaded.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Report Failed', description: err.message });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Deposit Volume', `₹${financialData?.depositVolume.toLocaleString()}`],
      ['Withdrawal Volume', `₹${financialData?.withdrawalVolume.toLocaleString()}`],
      ['Net Flow', `₹${financialData?.netFlow.toLocaleString()}`],
      ['Total Users', financialData?.totalUsers],
      ['New Users', financialData?.newUsers]
    ];

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive financial analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => handleDownloadBskPdf(0)} disabled={generatingPdf} variant="outline" size="sm">
            {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            All Users BSK PDF
          </Button>
          <Button onClick={() => handleDownloadBskPdf(100)} disabled={generatingPdf} size="sm">
            {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {generatingPdf ? 'Generating...' : '100+ BSK Users PDF'}
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['today', 'week', 'month', 'all'] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : range === 'month' ? 'This Month' : 'All Time'}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(financialData?.netFlow || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ₹{financialData?.netFlow.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{financialData?.depositVolume.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">₹{financialData?.withdrawalVolume.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              New Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{financialData?.newUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">of {financialData?.totalUsers.toLocaleString() || 0} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INR Deposits</TableCell>
                    <TableCell className="text-right font-mono">₹{financialData?.depositVolume.toLocaleString() || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INR Withdrawals</TableCell>
                    <TableCell className="text-right font-mono text-red-500">-₹{financialData?.withdrawalVolume.toLocaleString() || 0}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold">Net Flow</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${(financialData?.netFlow || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(financialData?.netFlow || 0) >= 0 ? '+' : ''}₹{financialData?.netFlow.toLocaleString() || 0}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{financialData?.transactionCount || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
