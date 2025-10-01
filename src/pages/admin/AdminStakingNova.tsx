import * as React from "react";
import { useState } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminStakingNova() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");

  const stakingData = [
    {
      id: "1",
      user: "alice@example.com",
      asset: "BTC",
      amount: "2.5",
      duration: "90 days",
      apy: "8.5%",
      status: "Active",
      startDate: "2025-01-01",
      endDate: "2025-04-01",
    },
    {
      id: "2",
      user: "bob@example.com",
      asset: "ETH",
      amount: "15.0",
      duration: "180 days",
      apy: "12.0%",
      status: "Active",
      startDate: "2024-12-15",
      endDate: "2025-06-13",
    },
    {
      id: "3",
      user: "charlie@example.com",
      asset: "USDT",
      amount: "10000",
      duration: "30 days",
      apy: "5.0%",
      status: "Matured",
      startDate: "2024-12-01",
      endDate: "2024-12-31",
    },
  ];

  const columns = [
    { key: "user", label: "User" },
    {
      key: "asset",
      label: "Asset",
      render: (row: any) => (
        <span className="font-medium font-mono">
          {row.amount} {row.asset}
        </span>
      ),
    },
    { key: "duration", label: "Duration" },
    { key: "apy", label: "APY" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Active" ? "default" : "outline"}
          className={cn(
            row.status === "Active"
              ? "bg-success/10 text-success border-success/20"
              : "bg-accent/10 text-accent border-accent/20"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "endDate", label: "End Date" },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "active", label: "Active", value: "Active" },
        { id: "matured", label: "Matured", value: "Matured" },
      ],
    },
    {
      id: "asset",
      label: "Asset",
      options: [
        { id: "btc", label: "BTC", value: "BTC" },
        { id: "eth", label: "ETH", value: "ETH" },
        { id: "usdt", label: "USDT", value: "USDT" },
      ],
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "Admin Mike",
      action: "Staking Activated",
      changes: [{ field: "status", before: "Pending", after: "Active" }],
    },
  ];

  return (
    <div data-testid="page-admin-staking" className="space-y-4 pb-6">
      {/* Program KPIs */}
      <CardLane title="Staking Metrics">
        <KPIStat
          label="Total TVL"
          value="$2.4M"
          delta={{ value: 12.5, trend: "up" }}
          sparkline={[1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4]}
          icon={<Coins className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Active Stakes"
          value="1,847"
          delta={{ value: 8.2, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Avg APY"
          value="9.2%"
          delta={{ value: 0.5, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPIStat
          label="Total Rewards"
          value="$128k"
          delta={{ value: 15.3, trend: "up" }}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Staking
          </h1>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent border-[hsl(225_24%_22%/0.16)]"
          >
            Region Settings
          </Button>
        </div>

        <FilterChips
          groups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        <DataGridAdaptive
          data={stakingData}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.id}
              title={`${item.amount} ${item.asset}`}
              subtitle={item.user}
              fields={[
                { label: "APY", value: item.apy },
                { label: "End Date", value: item.endDate },
              ]}
              status={{
                label: item.status,
                variant: item.status === "Active" ? "success" : "primary",
              }}
              onClick={() => setSelectedRecord(item)}
              selected={selected}
            />
          )}
          onRowClick={(row) => setSelectedRecord(row)}
          selectable
        />
      </div>

      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={`${selectedRecord?.amount} ${selectedRecord?.asset} Stake`}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    <p className="text-sm text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <AuditTrailViewer entries={mockAuditEntries} />
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
