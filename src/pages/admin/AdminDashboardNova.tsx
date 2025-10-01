import * as React from "react";
import { CardLane } from "@/components/astra/CardLane";
import { KPIChip } from "@/components/astra/KPIChip";
import { Users, FileCheck, ArrowDownToLine, ArrowUpFromLine, Dice5, Gift, Megaphone } from "lucide-react";

/**
 * AdminDashboardNova - Nova Admin DS Dashboard
 * Phase 1: Basic structure with KPI lane
 * Future: Add Queues lane, Programs Health lane, Quick Actions, Recent Activity
 */
export default function AdminDashboardNova() {
  return (
    <div data-testid="page-admin-home" className="space-y-6 p-4">
      {/* KPI Lane */}
      <CardLane title="Key Metrics" enableParallax>
        <KPIChip
          icon={<Users className="w-4 h-4" />}
          value="1,234"
          label="Users"
          variant="primary"
          glow="subtle"
        />
        <KPIChip
          icon={<FileCheck className="w-4 h-4" />}
          value="23"
          label="KYC Pending"
          variant="warning"
          glow="subtle"
        />
        <KPIChip
          icon={<ArrowDownToLine className="w-4 h-4" />}
          value="$12.5K"
          label="Deposits Today"
          variant="success"
          glow="subtle"
        />
        <KPIChip
          icon={<ArrowUpFromLine className="w-4 h-4" />}
          value="$8.3K"
          label="Payouts"
          variant="accent"
          glow="subtle"
        />
        <KPIChip
          icon={<Dice5 className="w-4 h-4" />}
          value="+$234"
          label="Spin P&L"
          variant="success"
          glow="subtle"
        />
        <KPIChip
          icon={<Gift className="w-4 h-4" />}
          value="+$156"
          label="Draw P&L"
          variant="success"
          glow="subtle"
        />
        <KPIChip
          icon={<Megaphone className="w-4 h-4" />}
          value="$890"
          label="Ads Revenue"
          variant="primary"
          glow="subtle"
        />
      </CardLane>

      {/* Placeholder for future lanes */}
      <div className="p-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Phase 1 Complete: Nova Admin DS Foundation
        </p>
        <p className="text-xs text-muted-foreground">
          Next: Queues lane, Programs Health, Quick Actions, Recent Activity
        </p>
      </div>
    </div>
  );
}
