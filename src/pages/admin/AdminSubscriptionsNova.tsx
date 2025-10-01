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
import { Users, TrendingUp, DollarSign, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSubscriptionsNova() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");

  const subscriptionsData = [
    {
      id: "1",
      user: "alice@example.com",
      plan: "Premium",
      status: "Active",
      startDate: "2025-01-01",
      nextBilling: "2025-02-01",
      amount: "$29.99",
    },
    {
      id: "2",
      user: "bob@example.com",
      plan: "Pro",
      status: "Active",
      startDate: "2024-12-15",
      nextBilling: "2025-01-15",
      amount: "$49.99",
    },
    {
      id: "3",
      user: "charlie@example.com",
      plan: "Basic",
      status: "Cancelled",
      startDate: "2024-11-01",
      nextBilling: null,
      amount: "$9.99",
    },
  ];

  const columns = [
    { key: "user", label: "User" },
    { key: "plan", label: "Plan" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Active" ? "default" : "outline"}
          className={cn(
            row.status === "Active"
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "amount", label: "Amount" },
    { key: "nextBilling", label: "Next Billing" },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "active", label: "Active", value: "Active" },
        { id: "cancelled", label: "Cancelled", value: "Cancelled" },
      ],
    },
    {
      id: "plan",
      label: "Plan",
      options: [
        { id: "basic", label: "Basic", value: "Basic" },
        { id: "pro", label: "Pro", value: "Pro" },
        { id: "premium", label: "Premium", value: "Premium" },
      ],
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "Admin Sarah",
      action: "Subscription Activated",
      changes: [{ field: "status", before: "Pending", after: "Active" }],
    },
  ];

  return (
    <div data-testid="page-admin-subscriptions" className="space-y-4 pb-6">
      {/* KPI Lane */}
      <CardLane title="Subscription Metrics">
        <KPIStat
          label="Active Subs"
          value="1,247"
          delta={{ value: 8.5, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="MRR"
          value="$48.2k"
          delta={{ value: 12.3, trend: "up" }}
          sparkline={[38, 40, 42, 45, 46, 47, 48]}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Churn Rate"
          value="2.3%"
          delta={{ value: 0.5, trend: "down" }}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Avg Value"
          value="$38.65"
          delta={{ value: 3.2, trend: "up" }}
          icon={<Package className="w-4 h-4" />}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <h1 className="text-xl font-heading font-bold text-foreground">
          Subscriptions
        </h1>

        <FilterChips
          groups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        <DataGridAdaptive
          data={subscriptionsData}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.id}
              title={item.user}
              subtitle={`${item.plan} - ${item.amount}`}
              fields={[
                { label: "Status", value: item.status },
                { label: "Next Billing", value: item.nextBilling || "N/A" },
              ]}
              status={{
                label: item.status,
                variant: item.status === "Active" ? "success" : "default",
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
        title={selectedRecord?.user}
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
