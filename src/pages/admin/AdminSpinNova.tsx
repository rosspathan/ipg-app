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
import { RefreshCw, TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSpinNova() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");

  const spinData = [
    {
      id: "1",
      user: "alice@example.com",
      result: "100 BSK",
      cost: "10 IPG",
      status: "Won",
      timestamp: "2025-01-15 10:23",
      txHash: "0xabc...def",
    },
    {
      id: "2",
      user: "bob@example.com",
      result: "Try Again",
      cost: "10 IPG",
      status: "Lost",
      timestamp: "2025-01-15 10:45",
      txHash: "0x123...456",
    },
    {
      id: "3",
      user: "charlie@example.com",
      result: "500 BSK",
      cost: "10 IPG",
      status: "Won",
      timestamp: "2025-01-15 11:02",
      txHash: "0x789...abc",
    },
  ];

  const columns = [
    { key: "user", label: "User" },
    { key: "result", label: "Result" },
    { key: "cost", label: "Cost" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Won" ? "default" : "outline"}
          className={cn(
            row.status === "Won"
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "timestamp", label: "Time" },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "won", label: "Won", value: "Won" },
        { id: "lost", label: "Lost", value: "Lost" },
      ],
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "System",
      action: "Spin Executed",
      changes: [{ field: "result", before: null, after: "100 BSK" }],
    },
  ];

  return (
    <div data-testid="page-admin-spin" className="space-y-4 pb-6">
      {/* Program KPIs */}
      <CardLane title="Spin Wheel Metrics">
        <KPIStat
          label="Total Spins"
          value="24,847"
          delta={{ value: 18.5, trend: "up" }}
          sparkline={[20, 21, 22, 23, 23, 24, 24]}
          icon={<RefreshCw className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Win Rate"
          value="38.2%"
          delta={{ value: 1.2, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPIStat
          label="RTP"
          value="96.2%"
          delta={{ value: 0.3, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Net P&L"
          value="$12.4k"
          delta={{ value: 22.1, trend: "up" }}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Spin Wheel
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
          data={spinData}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.id}
              title={item.result}
              subtitle={item.user}
              fields={[
                { label: "Cost", value: item.cost },
                { label: "Time", value: item.timestamp },
              ]}
              status={{
                label: item.status,
                variant: item.status === "Won" ? "success" : "default",
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
        title={`Spin - ${selectedRecord?.user}`}
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
