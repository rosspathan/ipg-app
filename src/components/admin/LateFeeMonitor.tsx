import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, DollarSign, Users, Calculator, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const LateFeeMonitor = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Fetch late fee config
  const { data: config } = useQuery({
    queryKey: ["late-fee-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_late_fee_config")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch late fee logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["late-fee-logs", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_late_fee_log")
        .select(`
          *,
          bsk_loan_installments(installment_number),
          profiles(full_name)
        `)
        .gte("applied_at", `${selectedDate}T00:00:00`)
        .lte("applied_at", `${selectedDate}T23:59:59`)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["late-fee-stats", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_late_fee_log")
        .select("late_fee_bsk")
        .gte("applied_at", `${selectedDate}T00:00:00`)
        .lte("applied_at", `${selectedDate}T23:59:59`);

      if (error) throw error;

      const total = data.length;
      const totalFees = data.reduce((sum, log) => sum + Number(log.late_fee_bsk), 0);

      return { total, totalFees };
    },
  });

  // Manual trigger for late fee calculation
  const triggerCalculation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "bsk-loan-calculate-late-fees",
        {
          body: { scheduled_run: false },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Late fees calculated: ${data.processed_count} installments, ${data.total_fees.toFixed(2)} BSK in fees`
      );
      queryClient.invalidateQueries({ queryKey: ["late-fee-logs"] });
      queryClient.invalidateQueries({ queryKey: ["late-fee-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to calculate late fees: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Late Fee Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Track and manage late payment fees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
          />
          <Button
            onClick={() => triggerCalculation.mutate()}
            disabled={triggerCalculation.isPending}
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculate Late Fees
          </Button>
        </div>
      </div>

      {/* Configuration Card */}
      {config && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Grace Period</p>
                <p className="text-xl font-bold">{config.grace_period_days} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Late Fee Rate</p>
                <p className="text-xl font-bold">{config.late_fee_percent}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Late Fee</p>
                <p className="text-xl font-bold">{config.max_late_fee_bsk} BSK</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compound Daily</p>
                <p className="text-xl font-bold">
                  {config.compound_daily ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Users className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fees Applied</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Late Fees</p>
                <p className="text-2xl font-bold">
                  {stats?.totalFees.toFixed(2) || "0.00"} BSK
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Late Fee Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading logs...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No late fees applied on {selectedDate}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <p className="font-medium">
                        {log.profiles?.full_name || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Installment #{log.bsk_loan_installments?.installment_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Days Overdue</p>
                      <p className="font-bold text-destructive">{log.days_overdue}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Late Fee</p>
                      <p className="font-bold text-warning">
                        {Number(log.late_fee_bsk).toFixed(2)} BSK
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Applied</p>
                      <p className="text-sm">
                        {format(new Date(log.applied_at), "MMM dd, HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
