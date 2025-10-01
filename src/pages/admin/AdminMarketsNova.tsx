import * as React from "react";
import { useState } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Coins, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AdminMarketsNova - Assets (Tokens) + Pairs management
 * Two tabs: Tokens and Pairs with Quick List wizard
 */
export default function AdminMarketsNova() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("tokens");
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");

  // Mock data for tokens
  const tokensData = [
    {
      id: "1",
      symbol: "BTC",
      name: "Bitcoin",
      chain: "BTC",
      decimals: 8,
      status: "Listed",
      icon: "₿",
    },
    {
      id: "2",
      symbol: "ETH",
      name: "Ethereum",
      chain: "ETH",
      decimals: 18,
      status: "Listed",
      icon: "Ξ",
    },
    {
      id: "3",
      symbol: "USDT",
      name: "Tether",
      chain: "ERC20",
      decimals: 6,
      status: "Listed",
      icon: "₮",
    },
    {
      id: "4",
      symbol: "SOL",
      name: "Solana",
      chain: "SOL",
      decimals: 9,
      status: "Paused",
      icon: "◎",
    },
  ];

  const tokenColumns = [
    {
      key: "symbol",
      label: "Symbol",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{row.icon}</span>
          <span className="font-medium">{row.symbol}</span>
        </div>
      ),
    },
    { key: "name", label: "Name" },
    { key: "chain", label: "Chain" },
    { key: "decimals", label: "Decimals" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Listed" ? "default" : "outline"}
          className={
            row.status === "Listed"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "listed", label: "Listed", value: "Listed" },
        { id: "paused", label: "Paused", value: "Paused" },
      ],
    },
  ];

  // Mock data for pairs
  const pairsData = [
    {
      id: "1",
      pair: "BTC/USDT",
      base: "BTC",
      quote: "USDT",
      status: "Active",
      tickSize: "0.01",
      minNotional: "10",
      feeClass: "A",
    },
    {
      id: "2",
      pair: "ETH/USDT",
      base: "ETH",
      quote: "USDT",
      status: "Active",
      tickSize: "0.01",
      minNotional: "10",
      feeClass: "A",
    },
    {
      id: "3",
      pair: "SOL/USDT",
      base: "SOL",
      quote: "USDT",
      status: "Paused",
      tickSize: "0.001",
      minNotional: "5",
      feeClass: "B",
    },
  ];

  const pairColumns = [
    {
      key: "pair",
      label: "Pair",
      render: (row: any) => (
        <span className="font-medium font-mono">{row.pair}</span>
      ),
    },
    { key: "tickSize", label: "Tick Size" },
    { key: "minNotional", label: "Min Notional" },
    { key: "feeClass", label: "Fee Class" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Active" ? "default" : "outline"}
          className={
            row.status === "Active"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "Admin Mike",
      action: "Listed BTC",
      changes: [
        { field: "status", before: "Draft", after: "Listed" },
        { field: "decimals", before: null, after: 8 },
      ],
    },
    {
      id: "2",
      timestamp: "2025-01-14 14:10",
      operator: "Admin Sarah",
      action: "Created BTC/USDT pair",
      changes: [
        { field: "tickSize", before: null, after: "0.01" },
        { field: "minNotional", before: null, after: "10" },
      ],
    },
  ];

  return (
    <div data-testid="page-admin-markets" className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-foreground">
          Markets
        </h1>
        <Button
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90"
          onClick={() => console.log("Quick List wizard")}
        >
          <Plus className="w-4 h-4" />
          Quick List
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[hsl(230_28%_13%)] border border-[hsl(225_24%_22%/0.16)]">
          <TabsTrigger value="tokens" className="gap-2">
            <Coins className="w-4 h-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="pairs" className="gap-2">
            <Repeat className="w-4 h-4" />
            Pairs
          </TabsTrigger>
        </TabsList>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4 mt-4">
          <FilterChips
            groups={filterGroups}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />

          <DataGridAdaptive
            data={tokensData}
            columns={tokenColumns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected, onSelect) => (
              <RecordCard
                id={item.id}
                title={item.symbol}
                subtitle={item.name}
                fields={[
                  { label: "Chain", value: item.chain },
                  { label: "Decimals", value: String(item.decimals) },
                ]}
                status={{
                  label: item.status,
                  variant: item.status === "Listed" ? "success" : "warning",
                }}
                onClick={() => setSelectedRecord(item)}
                selected={selected}
              />
            )}
            onRowClick={(row) => setSelectedRecord(row)}
            selectable
          />
        </TabsContent>

        {/* Pairs Tab */}
        <TabsContent value="pairs" className="space-y-4 mt-4">
          <FilterChips
            groups={filterGroups}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />

          <DataGridAdaptive
            data={pairsData}
            columns={pairColumns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected, onSelect) => (
              <RecordCard
                id={item.id}
                title={item.pair}
                subtitle={`${item.base} / ${item.quote}`}
                fields={[
                  { label: "Tick Size", value: item.tickSize },
                  { label: "Fee Class", value: item.feeClass },
                ]}
                status={{
                  label: item.status,
                  variant: item.status === "Active" ? "success" : "warning",
                }}
                onClick={() => setSelectedRecord(item)}
                selected={selected}
              />
            )}
            onRowClick={(row) => setSelectedRecord(row)}
            selectable
          />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={
          activeTab === "tokens"
            ? `${selectedRecord?.symbol} - ${selectedRecord?.name}`
            : selectedRecord?.pair
        }
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key}
                    </p>
                    <p className="text-sm text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <AuditTrailViewer
              entries={mockAuditEntries}
              onExport={(format) => console.log("Export as", format)}
              onRevert={(id) => console.log("Revert", id)}
            />
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
