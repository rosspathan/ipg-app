import * as React from "react";
import { useState } from "react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Users, DollarSign, Calendar, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateUserBskReportPDF } from "@/lib/generateUserBskReport";
import { useToast } from "@/hooks/use-toast";

export default function AdminReportsNova() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const { toast } = useToast();

  const handleGenerateBskReport = async () => {
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-bsk-report');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch report data');
      generateUserBskReportPDF(data.data, data.generated_at);
      toast({ title: 'Report Generated', description: `PDF with ${data.total_users} users downloaded.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Report Failed', description: err.message });
    } finally {
      setGeneratingReport(false);
    }
  };


  const reports = [
    { id: "1", name: "User Activity Report", period: "Monthly", lastRun: "2025-01-15", category: "Users" },
    { id: "2", name: "Revenue Report", period: "Weekly", lastRun: "2025-01-14", category: "Finance" },
    { id: "3", name: "Program Performance", period: "Daily", lastRun: "2025-01-15", category: "Programs" },
    { id: "4", name: "Trading Volume Report", period: "Daily", lastRun: "2025-01-15", category: "Trading" },
    { id: "5", name: "Referral Earnings", period: "Monthly", lastRun: "2025-01-10", category: "Referrals" },
    { id: "6", name: "BSK Distribution", period: "Weekly", lastRun: "2025-01-13", category: "Finance" },
  ];

  const recentReports = [
    { id: "1", name: "Monthly User Growth", generated: "2025-01-15 14:30", size: "2.3 MB", status: "completed" },
    { id: "2", name: "Weekly Revenue Summary", generated: "2025-01-14 09:15", size: "1.8 MB", status: "completed" },
    { id: "3", name: "Program ROI Analysis", generated: "2025-01-13 16:45", size: "3.1 MB", status: "completed" },
  ];

  const columns = [
    { key: "name", label: "Report Name" },
    { key: "generated", label: "Generated" },
    { key: "size", label: "Size" },
    { key: "status", label: "Status" },
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
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={selectedPeriod === "day" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("day")}
            className="h-8"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Daily
          </Button>
          <Button
            size="sm"
            variant={selectedPeriod === "week" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("week")}
            className="h-8"
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant={selectedPeriod === "month" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("month")}
            className="h-8"
          >
            Monthly
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 ml-auto"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <h1 className="text-xl font-heading font-bold text-foreground">
          Reports
        </h1>

        {/* Available Reports */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Available Reports</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-220",
                  "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
                  "border-[hsl(225_24%_22%/0.16)]",
                  "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
                  selectedReport === report.id && "border-primary bg-[hsl(229_30%_16%)]"
                )}
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground">
                        {report.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {report.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {report.period} • Last run: {report.lastRun}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Generate", report.id);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Recent Reports</h2>
          <DataGridAdaptive
            columns={columns}
            data={recentReports}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => console.log("Download report:", row.id)}
            renderCard={(row) => (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{row.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{row.status}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.generated} • {row.size}
                </div>
              </div>
            )}
          />
        </div>

        {/* BSK User Balance Report */}
        <div
          className={cn(
            "p-6 rounded-2xl border",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <h3 className="text-sm font-medium text-foreground mb-2">
            All Users BSK Balance Report
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Download a comprehensive PDF with all users' BSK withdrawable balance, holding balance, total balance, wallet status, and wallet address. Audit-ready format.
          </p>
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleGenerateBskReport}
            disabled={generatingReport}
          >
            {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generatingReport ? 'Generating...' : 'Download BSK Report PDF'}
          </Button>
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
