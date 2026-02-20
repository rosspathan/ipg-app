import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, TrendingUp, Lock, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
interface DayGroup<T> {
  date: string;       // yyyy-MM-dd
  label: string;      // "Feb 20, 2026"
  total: number;
  count: number;
  rows: T[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByDay<T>(
  rows: T[],
  getDate: (r: T) => string,
  getAmount: (r: T) => number,
): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>();
  rows.forEach(r => {
    const raw = getDate(r);
    const day = raw.slice(0, 10); // yyyy-MM-dd
    const label = format(parseISO(day), 'MMM dd, yyyy');
    const existing = map.get(day) ?? { date: day, label, total: 0, count: 0, rows: [] };
    existing.total += getAmount(r);
    existing.count += 1;
    existing.rows.push(r);
    map.set(day, existing);
  });
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Day Card ─────────────────────────────────────────────────────────────────
function DayCard<T>({
  group,
  renderRow,
  unit,
  colorClass,
}: {
  group: DayGroup<T>;
  renderRow: (row: T, idx: number) => React.ReactNode;
  unit: string;
  colorClass: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Calendar className={cn("w-4 h-4", colorClass)} />
            <div>
              <p className="font-semibold text-sm">{group.label}</p>
              <p className="text-xs text-muted-foreground">{group.count} transaction{group.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {group.total.toFixed(6)} {unit}
            </Badge>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {group.rows.map((row, idx) => renderRow(row, idx))}
        </div>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminFeeCollections() {
  const navigate = useNavigate();
  const [days, setDays] = useState('30');
  const daysNum = parseInt(days);

  const since = subDays(new Date(), daysNum).toISOString();

  // Trading fees
  const { data: tradingRaw = [], isLoading: tLoading, refetch: refetchT } = useQuery({
    queryKey: ['fee-collections-trading', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_fees_collected')
        .select('fee_asset, fee_amount, created_at, symbol, side')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Staking fees
  const { data: stakingRaw = [], isLoading: sLoading, refetch: refetchS } = useQuery({
    queryKey: ['fee-collections-staking', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_staking_ledger')
        .select('tx_type, fee_amount, currency, created_at, notes, amount')
        .gt('fee_amount', 0)
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = tLoading || sLoading;
  const refetchAll = () => { refetchT(); refetchS(); };

  // Group by day
  type TradingRow = typeof tradingRaw[0];
  type StakingRow = typeof stakingRaw[0];

  const tradingGroups = groupByDay<TradingRow>(
    tradingRaw,
    r => r.created_at ?? '',
    r => Number(r.fee_amount ?? 0),
  );

  const stakingGroups = groupByDay<StakingRow>(
    stakingRaw,
    r => r.created_at ?? '',
    r => Number(r.fee_amount ?? 0),
  );

  // Totals
  const tradingTotal = tradingRaw.reduce((s, r) => s + Number(r.fee_amount ?? 0), 0);
  const stakingTotal = stakingRaw.reduce((s, r) => s + Number(r.fee_amount ?? 0), 0);

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary shrink-0" />
            Fee Collections
          </h1>
          <p className="text-xs text-muted-foreground">Daily breakdown by date</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[110px] text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={refetchAll} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Trading Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold font-mono">{tradingTotal.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">{tradingRaw.length} trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-secondary" />
              Staking Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold font-mono">{stakingTotal.toFixed(4)} <span className="text-xs font-normal text-muted-foreground">IPG</span></p>
            <p className="text-xs text-muted-foreground">{stakingRaw.length} ops</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="trading">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="trading" className="text-xs">
              Trading Fees
              {tradingRaw.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{tradingRaw.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="staking" className="text-xs">
              Staking Fees
              {stakingRaw.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{stakingRaw.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Trading Fees Tab */}
          <TabsContent value="trading" className="space-y-2 mt-3">
            {tradingGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No trading fees in the selected period
                </CardContent>
              </Card>
            ) : (
              tradingGroups.map(group => (
                <DayCard
                  key={group.date}
                  group={group}
                  unit={group.rows[0]?.fee_asset ?? ''}
                  colorClass="text-primary"
                  renderRow={(row, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{row.symbol ?? '—'}</span>
                        <span className="text-muted-foreground capitalize">{row.side ?? '—'}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {row.created_at ? format(parseISO(row.created_at), 'HH:mm:ss') : '—'}
                        </span>
                      </div>
                      <span className="font-mono font-semibold">
                        {Number(row.fee_amount ?? 0).toFixed(6)} {row.fee_asset}
                      </span>
                    </div>
                  )}
                />
              ))
            )}
          </TabsContent>

          {/* Staking Fees Tab */}
          <TabsContent value="staking" className="space-y-2 mt-3">
            {stakingGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No staking fees in the selected period
                </CardContent>
              </Card>
            ) : (
              stakingGroups.map(group => (
                <DayCard
                  key={group.date}
                  group={group}
                  unit="IPG"
                  colorClass="text-secondary"
                  renderRow={(row, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium capitalize">{(row.tx_type ?? '—').replace(/_/g, ' ')}</span>
                        {row.notes && <span className="text-muted-foreground text-[10px] line-clamp-1">{row.notes}</span>}
                        <span className="text-muted-foreground text-[10px]">
                          Amt: {Number(row.amount ?? 0).toFixed(4)} IPG
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {row.created_at ? format(parseISO(row.created_at), 'HH:mm:ss') : '—'}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-secondary">
                        {Number(row.fee_amount ?? 0).toFixed(6)} IPG
                      </span>
                    </div>
                  )}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
