import * as React from "react";
import { useState } from "react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Users, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSubscriptionsNova() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const subscriptionTiers = [
    {
      id: "1",
      name: "Basic",
      price: 499,
      duration: 30,
      features: "Ad-free viewing, 2x BSK rewards",
      active: 342,
      revenue: 170658,
      status: "active"
    },
    {
      id: "2",
      name: "Premium",
      price: 999,
      duration: 30,
      features: "Ad-free, 3x BSK rewards, Priority support",
      active: 128,
      revenue: 127872,
      status: "active"
    },
    {
      id: "3",
      name: "VIP",
      price: 2499,
      duration: 30,
      features: "All Premium + Exclusive programs",
      active: 45,
      revenue: 112455,
      status: "active"
    },
  ];

  const recentSubscriptions = [
    { id: "1", user: "user_abc123", tier: "Premium", amount: 999, date: "2025-01-15", status: "active" },
    { id: "2", user: "user_def456", tier: "Basic", amount: 499, date: "2025-01-15", status: "active" },
    { id: "3", user: "user_ghi789", tier: "VIP", amount: 2499, date: "2025-01-14", status: "active" },
    { id: "4", user: "user_jkl012", tier: "Premium", amount: 999, date: "2025-01-14", status: "expired" },
  ];

  const columns = [
    { key: "user", label: "User ID" },
    { key: "tier", label: "Tier" },
    { key: "amount", label: "Amount (INR)" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
  ];

  const totalRevenue = subscriptionTiers.reduce((sum, tier) => sum + tier.revenue, 0);
  const totalActive = subscriptionTiers.reduce((sum, tier) => sum + tier.active, 0);

  return (
    <div data-testid="page-admin-subscriptions" className="space-y-4 pb-6">
      {/* Summary KPIs */}
      <CardLane title="Subscription Metrics">
        <KPIStat
          label="Active Subscriptions"
          value={totalActive.toString()}
          delta={{ value: 12.5, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Monthly Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(0)}k`}
          delta={{ value: 18.5, trend: "up" }}
          sparkline={[280, 310, 340, 370, 390, 400, 411]}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Avg. Value"
          value={`₹${Math.round(totalRevenue / totalActive)}`}
          delta={{ value: 5.2, trend: "up" }}
          icon={<CreditCard className="w-4 h-4" />}
        />
        <KPIStat
          label="Growth Rate"
          value="15.8%"
          delta={{ value: 3.2, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Subscription Tiers
          </h1>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => console.log("Create new tier")}
          >
            <Plus className="w-4 h-4" />
            New Tier
          </Button>
        </div>

        {/* Subscription Tiers */}
        <div className="grid gap-4 md:grid-cols-3">
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "p-6 rounded-2xl border transition-all duration-220",
                "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
                "border-[hsl(225_24%_22%/0.16)]",
                "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                selectedTier === tier.id && "border-primary bg-[hsl(229_30%_16%)]"
              )}
              onClick={() => setSelectedTier(tier.id)}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-heading font-bold text-foreground">
                      {tier.name}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {tier.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary">₹{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/{tier.duration}d</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {tier.features}
                </p>

                <div className="pt-4 border-t border-border/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Users</span>
                    <span className="font-semibold text-foreground">{tier.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold text-primary">₹{(tier.revenue / 1000).toFixed(1)}k</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Edit tier:", tier.id);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Delete tier:", tier.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Subscriptions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Recent Subscriptions</h2>
          <DataGridAdaptive
            columns={columns}
            data={recentSubscriptions}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => console.log("View subscription:", row.id)}
            renderCard={(row) => (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{row.tier}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{row.status}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.user} • ₹{row.amount}
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
