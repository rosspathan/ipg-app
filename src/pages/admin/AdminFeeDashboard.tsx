import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowLeft, DollarSign, TrendingUp, BarChart3, Loader2, RefreshCw, Coins, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
];

export default function AdminFeeDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('14');

  // Trading fees summary
  const { data: tradingFeeSummary, isLoading: tradingLoading, refetch: refetchTrading } = useQuery({
    queryKey: ['admin-trading-fees-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_fees_collected')
        .select('fee_asset, fee_amount, created_at, symbol, side');

      if (error) throw error;
      return data || [];
    },
  });

  // Staking fees from crypto_staking_ledger
  const { data: stakingFees, isLoading: stakingLoading, refetch: refetchStaking } = useQuery({
    queryKey: ['admin-staking-fees-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_staking_ledger')
        .select('tx_type, fee_amount, currency, created_at, notes')
        .gt('fee_amount', 0);

      if (error) throw error;
      return data || [];
    },
  });

  // BSK internal fees (admin_fees_ledger)
  const { data: bskFees, isLoading: bskLoading, refetch: refetchBsk } = useQuery({
    queryKey: ['admin-bsk-fees-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_fees_ledger')
        .select('source_type, fee_bsk, fee_inr, bsk_rate_snapshot, created_at');

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = tradingLoading || stakingLoading || bskLoading;

  const refetchAll = () => {
    refetchTrading();
    refetchStaking();
    refetchBsk();
  };

  // Aggregate trading fees by asset
  const tradingByAsset = React.useMemo(() => {
    if (!tradingFeeSummary) return [];
    const map = new Map<string, { asset: string; total: number; count: number }>();
    tradingFeeSummary.forEach(f => {
      const existing = map.get(f.fee_asset) || { asset: f.fee_asset, total: 0, count: 0 };
      existing.total += Number(f.fee_amount || 0);
      existing.count += 1;
      map.set(f.fee_asset, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tradingFeeSummary]);

  // Aggregate trading fees by pair
  const tradingByPair = React.useMemo(() => {
    if (!tradingFeeSummary) return [];
    const map = new Map<string, { pair: string; total: number; count: number }>();
    tradingFeeSummary.forEach(f => {
      const pair = f.symbol || 'Unknown';
      const existing = map.get(pair) || { pair, total: 0, count: 0 };
      existing.total += Number(f.fee_amount || 0);
      existing.count += 1;
      map.set(pair, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tradingFeeSummary]);

  // Staking fees aggregated
  const stakingByType = React.useMemo(() => {
    if (!stakingFees) return [];
    const map = new Map<string, { type: string; total: number; count: number; currency: string }>();
    stakingFees.forEach(f => {
      const type = f.tx_type || 'unknown';
      const existing = map.get(type) || { type, total: 0, count: 0, currency: f.currency || 'IPG' };
      existing.total += Number(f.fee_amount || 0);
      existing.count += 1;
      map.set(type, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stakingFees]);

  // Daily trend chart data
  const dailyTrendData = React.useMemo(() => {
    const days = parseInt(dateRange);
    const result: { date: string; trading: number; staking: number; bsk: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'MMM dd');
      const start = startOfDay(day).toISOString();
      const end = endOfDay(day).toISOString();

      let tradingTotal = 0;
      let stakingTotal = 0;
      let bskTotal = 0;

      tradingFeeSummary?.forEach(f => {
        if (f.created_at >= start && f.created_at <= end) {
          tradingTotal += Number(f.fee_amount || 0);
        }
      });

      stakingFees?.forEach(f => {
        if (f.created_at >= start && f.created_at <= end) {
          stakingTotal += Number(f.fee_amount || 0);
        }
      });

      bskFees?.forEach(f => {
        if (f.created_at >= start && f.created_at <= end) {
          bskTotal += Number(f.fee_bsk || 0);
        }
      });

      result.push({ date: label, trading: tradingTotal, staking: stakingTotal, bsk: bskTotal });
    }

    return result;
  }, [tradingFeeSummary, stakingFees, bskFees, dateRange]);

  // Totals
  const totals = React.useMemo(() => {
    const tradingTotal = tradingByAsset.reduce((sum, a) => sum + a.total, 0);
    const tradingCount = tradingByAsset.reduce((sum, a) => sum + a.count, 0);
    const stakingTotal = stakingByType.reduce((sum, a) => sum + a.total, 0);
    const stakingCount = stakingByType.reduce((sum, a) => sum + a.count, 0);
    const bskTotal = (bskFees || []).reduce((sum, f) => sum + Number(f.fee_bsk || 0), 0);
    const bskCount = (bskFees || []).length;

    return { tradingTotal, tradingCount, stakingTotal, stakingCount, bskTotal, bskCount };
  }, [tradingByAsset, stakingByType, bskFees]);

  // Pie chart data
  const pieData = React.useMemo(() => {
    return tradingByAsset.map(a => ({
      name: a.asset,
      value: parseFloat(a.total.toFixed(4)),
    }));
  }, [tradingByAsset]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Fee Revenue Dashboard
              </h1>
              <p className="text-muted-foreground">
                Unified view of all platform fee collections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Trading Fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.tradingTotal.toFixed(4)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                From {totals.tradingCount} trades • 0.5% per trade
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {tradingByAsset.map(a => (
                  <Badge key={a.asset} variant="secondary" className="text-xs">
                    {a.total.toFixed(4)} {a.asset}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Staking/Unstaking Fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.stakingTotal.toFixed(4)} <span className="text-lg text-muted-foreground">IPG</span></div>
              <p className="text-sm text-muted-foreground mt-1">
                From {totals.stakingCount} operations • 0.5% each
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {stakingByType.map(s => (
                  <Badge key={s.type} variant="outline" className="text-xs">
                    {s.type}: {s.total.toFixed(4)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Coins className="h-4 w-4" /> BSK Internal Fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.bskTotal.toFixed(4)} <span className="text-lg text-muted-foreground">BSK</span></div>
              <p className="text-sm text-muted-foreground mt-1">
                From {totals.bskCount} operations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Fee Trend
            </CardTitle>
            <CardDescription>Fee revenue collected per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="trading" name="Trading" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="staking" name="Staking" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bsk" name="BSK Fees" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tables */}
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trading">Trading Fees</TabsTrigger>
            <TabsTrigger value="staking">Staking Fees</TabsTrigger>
            <TabsTrigger value="bsk">BSK Fees</TabsTrigger>
          </TabsList>

          {/* Trading Fees by Pair */}
          <TabsContent value="trading">
            <Card>
              <CardHeader>
                <CardTitle>Trading Fees by Pair</CardTitle>
                <CardDescription>Breakdown of trading fee revenue by trading pair</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Total Fees</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradingByPair.map(p => (
                        <TableRow key={p.pair}>
                          <TableCell className="font-medium">{p.pair}</TableCell>
                          <TableCell className="text-right font-mono">{p.total.toFixed(6)}</TableCell>
                          <TableCell className="text-right">{p.count}</TableCell>
                        </TableRow>
                      ))}
                      {tradingByPair.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            No trading fees collected yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pie Chart */}
                  {pieData.length > 0 && (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staking Fees */}
          <TabsContent value="staking">
            <Card>
              <CardHeader>
                <CardTitle>Staking & Unstaking Fees</CardTitle>
                <CardDescription>IPG fees collected from staking operations (0.5% each)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation Type</TableHead>
                      <TableHead className="text-right">Total Fees (IPG)</TableHead>
                      <TableHead className="text-right">Operations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stakingByType.map(s => (
                      <TableRow key={s.type}>
                        <TableCell className="font-medium capitalize">{s.type.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-right font-mono">{s.total.toFixed(6)} IPG</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                      </TableRow>
                    ))}
                    {stakingByType.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No staking fees collected yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BSK Fees */}
          <TabsContent value="bsk">
            <Card>
              <CardHeader>
                <CardTitle>BSK Internal Fees</CardTitle>
                <CardDescription>BSK fees from draws, conversions, and other internal operations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Fee (BSK)</TableHead>
                      <TableHead className="text-right">Fee (INR)</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bskFees || []).slice(0, 50).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium capitalize">{(f.source_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-right font-mono">{Number(f.fee_bsk || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono">₹{Number(f.fee_inr || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {f.created_at ? format(new Date(f.created_at), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(bskFees || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No BSK fees collected yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Where Fees Reside */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where Are Collected Fees?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Trading fees</strong> — Remain in the Trading Hot Wallet pool (0x4a6A...ACF5)</li>
              <li>• <strong>Staking/Unstaking fees</strong> — Remain in the Staking Hot Wallet pool (0x88b5...73E4)</li>
              <li>• <strong>BSK fees</strong> — Deducted internally from BSK balances (no on-chain wallet)</li>
              <li className="text-xs italic pt-2">To withdraw collected fees, perform a manual admin transfer from each hot wallet to your treasury.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
