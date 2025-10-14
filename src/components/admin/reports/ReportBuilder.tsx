import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ReportBuilder() {
  const { toast } = useToast();
  const [reportName, setReportName] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const availableMetrics = [
    { id: "deposits", label: "Total Deposits" },
    { id: "withdrawals", label: "Total Withdrawals" },
    { id: "active_users", label: "Active Users" },
    { id: "new_users", label: "New User Registrations" },
    { id: "bsk_supply", label: "BSK Total Supply" },
    { id: "inr_balance", label: "INR Balance" },
    { id: "transaction_volume", label: "Transaction Volume" },
    { id: "fee_revenue", label: "Fee Revenue" },
  ];

  const handleSaveReport = async () => {
    if (!reportName || selectedMetrics.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a report name and select at least one metric",
      });
      return;
    }

    const { error } = await supabase.from("saved_reports").insert({
      report_name: reportName,
      report_type: "custom",
      config: {
        metrics: selectedMetrics,
        dateRange,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save report",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Report saved successfully",
    });

    setReportName("");
    setSelectedMetrics([]);
    setDateRange({ start: "", end: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Report Name</Label>
          <Input
            placeholder="e.g., Monthly Executive Summary"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
        </div>

        <div>
          <Label className="mb-4 block">Select Metrics</Label>
          <div className="grid grid-cols-2 gap-4">
            {availableMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center space-x-2">
                <Checkbox
                  id={metric.id}
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedMetrics([...selectedMetrics, metric.id]);
                    } else {
                      setSelectedMetrics(
                        selectedMetrics.filter((m) => m !== metric.id)
                      );
                    }
                  }}
                />
                <Label htmlFor={metric.id} className="cursor-pointer">
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSaveReport}>
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Generate Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
