import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, Download, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LedgerEntry {
  id: string;
  user_id: string;
  amount_bsk: number;
  amount_inr: number;
  balance_before: number;
  balance_after: number;
  tx_type: string;
  tx_subtype?: string;
  type?: string;
  reference_id?: string;
  metadata?: any;
  notes?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function BSKLedgerViewer() {
  const [activeTab, setActiveTab] = useState<'holding' | 'withdrawable'>('holding');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { toast } = useToast();

  // Fetch ledger data
  const { data: ledgerData, isLoading, refetch } = useQuery({
    queryKey: ['bsk-ledger', activeTab, searchTerm, filterType, dateFrom, dateTo, currentPage, pageSize],
    queryFn: async () => {
      const tableName = activeTab === 'holding' ? 'bsk_holding_ledger' : 'bsk_withdrawable_ledger';
      
      let query = supabase
        .from(tableName)
        .select(`
          id,
          user_id,
          amount_bsk,
          amount_inr,
          balance_before,
          balance_after,
          tx_type,
          tx_subtype,
          type,
          reference_id,
          metadata,
          notes,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('tx_type', filterType);
      }

      if (searchTerm) {
        // Search by user ID or email
        if (searchTerm.includes('@')) {
          query = query.ilike('profiles.email', `%${searchTerm}%`);
        } else {
          query = query.eq('user_id', searchTerm);
        }
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      // Pagination
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching ledger:', error);
        throw error;
      }

      return {
        entries: data?.map((entry: any) => ({
          ...entry,
          user_email: entry.profiles?.email,
          user_name: entry.profiles?.full_name,
        })) || [],
        totalCount: count || 0
      };
    },
    enabled: true
  });

  // Get unique transaction types for filter
  const { data: transactionTypes } = useQuery({
    queryKey: ['bsk-ledger-types', activeTab],
    queryFn: async () => {
      const tableName = activeTab === 'holding' ? 'bsk_holding_ledger' : 'bsk_withdrawable_ledger';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('tx_type')
        .not('tx_type', 'is', null);
      
      if (error) throw error;
      
      const types = [...new Set(data?.map(d => d.tx_type) || [])];
      return types;
    },
    enabled: true
  });

  // Calculate stats
  const stats = {
    totalEntries: ledgerData?.totalCount || 0,
    totalPages: Math.ceil((ledgerData?.totalCount || 0) / pageSize),
    totalAmount: ledgerData?.entries.reduce((sum, entry) => sum + Number(entry.amount_bsk), 0) || 0,
    avgAmount: ledgerData?.entries.length ? 
      (ledgerData.entries.reduce((sum, entry) => sum + Number(entry.amount_bsk), 0) / ledgerData.entries.length) : 0
  };

  const exportToCSV = () => {
    if (!ledgerData?.entries.length) {
      toast({
        title: "No Data",
        description: "No entries to export",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Date', 'User ID', 'Email', 'Name', 'Type', 'Subtype', 'Amount BSK', 'Amount INR', 'Balance Before', 'Balance After', 'Notes'];
    const rows = ledgerData.entries.map(entry => [
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
      entry.user_id,
      entry.user_email || 'N/A',
      entry.user_name || 'N/A',
      entry.tx_type,
      entry.tx_subtype || 'N/A',
      entry.amount_bsk,
      entry.amount_inr,
      entry.balance_before,
      entry.balance_after,
      entry.notes || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk_${activeTab}_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: "Exported Successfully",
      description: `${ledgerData.entries.length} entries exported to CSV`
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">BSK Ledger Viewer</h1>
        <p className="text-muted-foreground mt-2">
          Track all holding and withdrawable BSK transactions for debugging and auditing
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'holding' | 'withdrawable');
        setCurrentPage(1);
      }}>
        <TabsList>
          <TabsTrigger value="holding">Holding Ledger</TabsTrigger>
          <TabsTrigger value="withdrawable">Withdrawable Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ledgerData?.entries.length || 0} entries</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Amount (Page)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} BSK</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Amount (Page)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgAmount.toFixed(2)} BSK</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="User ID or email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Type</label>
                  <Select value={filterType} onValueChange={(value) => {
                    setFilterType(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {transactionTypes?.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => {
                          setDateFrom(date);
                          setCurrentPage(1);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => {
                          setDateTo(date);
                          setCurrentPage(1);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex gap-2">
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, stats.totalEntries)} of {stats.totalEntries} entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Subtype</TableHead>
                          <TableHead className="text-right">Amount BSK</TableHead>
                          <TableHead className="text-right">Amount INR</TableHead>
                          <TableHead className="text-right">Before</TableHead>
                          <TableHead className="text-right">After</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerData?.entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          ledgerData?.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-mono text-xs">
                                {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss')}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs">{entry.user_id.substring(0, 8)}...</span>
                                  {entry.user_email && (
                                    <span className="text-xs text-muted-foreground">{entry.user_email}</span>
                                  )}
                                  {entry.user_name && (
                                    <span className="text-xs text-muted-foreground">{entry.user_name}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{entry.tx_type}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {entry.tx_subtype ? (
                                  <Badge variant="secondary" className="text-xs">{entry.tx_subtype}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                <span className={entry.amount_bsk >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {entry.amount_bsk >= 0 ? '+' : ''}{entry.amount_bsk.toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                ₹{entry.amount_inr?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {entry.balance_before?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {entry.balance_after?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px]">
                                {entry.notes ? (
                                  <span className="text-muted-foreground truncate">{entry.notes}</span>
                                ) : entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                                  <details className="cursor-pointer">
                                    <summary className="text-primary">Metadata</summary>
                                    <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                                      {JSON.stringify(entry.metadata, null, 2)}
                                    </pre>
                                  </details>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {stats.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select 
                          value={pageSize.toString()} 
                          onValueChange={(value) => {
                            setPageSize(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {stats.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(stats.totalPages, p + 1))}
                          disabled={currentPage === stats.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
