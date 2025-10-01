import * as React from "react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminReportsNova() {
  const reports = [
    { id: "1", name: "User Activity Report", period: "Monthly", lastRun: "2025-01-15" },
    { id: "2", name: "Revenue Report", period: "Weekly", lastRun: "2025-01-14" },
    { id: "3", name: "Program Performance", period: "Daily", lastRun: "2025-01-15" },
  ];

  return (
    <div data-testid="page-admin-reports" className="space-y-4 pb-6">
      {/* Summary KPIs */}
      <CardLane title="Report Metrics">
        <KPIStat
          label="Total Reports"
          value="248"
          delta={{ value: 12, trend: "up" }}
          icon={<FileText className="w-4 h-4" />}
        />
        <KPIStat
          label="Revenue MTD"
          value="$248k"
          delta={{ value: 18.5, trend: "up" }}
          sparkline={[180, 190, 200, 220, 230, 240, 248]}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Active Users"
          value="12,847"
          delta={{ value: 8.2, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Growth Rate"
          value="22.5%"
          delta={{ value: 3.2, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <h1 className="text-xl font-heading font-bold text-foreground">
          Reports
        </h1>

        {/* Available Reports */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Available Reports</h2>
          <div className="grid gap-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className={cn(
                  "p-4 rounded-2xl border",
                  "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
                  "border-[hsl(225_24%_22%/0.16)]",
                  "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                  "transition-colors duration-220"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-foreground">
                      {report.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {report.period} • Last run: {report.lastRun}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
                    onClick={() => console.log("Generate", report.id)}
                  >
                    <Download className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Report Builder */}
        <div
          className={cn(
            "p-6 rounded-2xl border",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <h3 className="text-sm font-medium text-foreground mb-4">
            Custom Report Builder
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Build custom reports with flexible data selection and export options.
          </p>
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => console.log("Open builder")}
          >
            <FileText className="w-4 h-4" />
            Open Builder
          </Button>
        </div>
      </div>
    </div>
  );
}
