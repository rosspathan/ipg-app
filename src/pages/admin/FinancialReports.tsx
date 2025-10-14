import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportBuilder } from "@/components/admin/reports/ReportBuilder";
import { ReportViewer } from "@/components/admin/reports/ReportViewer";
import { ExportOptions } from "@/components/admin/reports/ExportOptions";
import { format } from "date-fns";

export default function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState<string>("daily_ops");
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report-data", selectedReport, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("generate_report_data", {
        p_report_type: selectedReport,
        p_date_start: dateRange.start,
        p_date_end: dateRange.end,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: savedReports } = useQuery({
    queryKey: ["saved-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">
            Generate and export comprehensive financial reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
          <ExportOptions reportData={reportData} reportType={selectedReport} />
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-built Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Button
                  variant={selectedReport === "daily_ops" ? "default" : "outline"}
                  className="justify-start h-auto p-4"
                  onClick={() => setSelectedReport("daily_ops")}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Daily Operations</div>
                    <div className="text-xs opacity-70">
                      Deposits, withdrawals, and net flow
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedReport === "user_activity" ? "default" : "outline"}
                  className="justify-start h-auto p-4"
                  onClick={() => setSelectedReport("user_activity")}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">User Activity</div>
                    <div className="text-xs opacity-70">
                      New users, active users, engagement
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedReport === "currency_flow" ? "default" : "outline"}
                  className="justify-start h-auto p-4"
                  onClick={() => setSelectedReport("currency_flow")}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Currency Flow</div>
                    <div className="text-xs opacity-70">
                      BSK and INR circulation metrics
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedReport === "compliance" ? "default" : "outline"}
                  className="justify-start h-auto p-4"
                  onClick={() => setSelectedReport("compliance")}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Compliance Report</div>
                    <div className="text-xs opacity-70">
                      KYC status and flagged accounts
                    </div>
                  </div>
                </Button>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <ReportViewer
                reportData={reportData}
                reportType={selectedReport}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedReports?.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <div>
                      <h4 className="font-semibold">{report.report_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {report.report_type} • Last generated:{" "}
                        {report.last_generated_at
                          ? format(new Date(report.last_generated_at), "PPP")
                          : "Never"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                ))}
                {(!savedReports || savedReports.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No saved reports yet. Create custom reports to save them.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
