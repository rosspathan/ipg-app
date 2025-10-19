import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AutoDebitLog {
  id: string;
  installment_id: string;
  user_id: string;
  loan_id: string;
  scheduled_date: string;
  amount_bsk: number;
  status: string;
  error_message: string | null;
  created_at: string;
  bsk_loan_installments: {
    installment_number: number;
    due_date: string;
    total_due_bsk: number;
  };
  profiles: {
    full_name: string;
  };
}

export const AutoDebitMonitor = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Fetch auto-debit logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["auto-debit-logs", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_auto_debit_log")
        .select(`
          *,
          bsk_loan_installments (
            installment_number,
            due_date,
            total_due_bsk
          ),
          profiles (
            full_name
          )
        `)
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lte("created_at", `${selectedDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AutoDebitLog[];
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["auto-debit-stats", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_auto_debit_log")
        .select("status, amount_bsk")
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lte("created_at", `${selectedDate}T23:59:59`);

      if (error) throw error;

      const total = data.length;
      const successful = data.filter((log) => log.status === "success").length;
      const failed = data.filter((log) => log.status === "failed").length;
      const totalAmount = data
        .filter((log) => log.status === "success")
        .reduce((sum, log) => sum + Number(log.amount_bsk), 0);

      return { total, successful, failed, totalAmount };
    },
  });

  // Manual trigger mutation
  const triggerAutoDebit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "bsk-loan-auto-debit",
        {
          body: {
            scheduled_run: false,
            process_date: selectedDate,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Auto-debit processed: ${data.successful_count} successful, ${data.failed_count} failed`
      );
      queryClient.invalidateQueries({ queryKey: ["auto-debit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["auto-debit-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to trigger auto-debit: ${error.message}`);
    },
  });

  const getResultBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auto-Debit Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Track weekly loan payment auto-debits
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
            onClick={() => triggerAutoDebit.mutate()}
            disabled={triggerAutoDebit.isPending}
            className="gap-2"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                triggerAutoDebit.isPending && "animate-spin"
              )}
            />
            Trigger Auto-Debit
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-success">
                  {stats?.successful || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">
                  {stats?.failed || 0}
                </p>
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
                <p className="text-sm text-muted-foreground">Amount Collected</p>
                <p className="text-2xl font-bold">
                  {stats?.totalAmount.toFixed(2) || "0.00"} BSK
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
            <TrendingUp className="w-5 h-5" />
            Auto-Debit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading logs...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No auto-debit logs found for {selectedDate}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
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
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        {Number(log.amount_bsk).toFixed(2)} BSK
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {format(
                          new Date(log.bsk_loan_installments?.due_date),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getResultBadge(log.status)}
                    </div>

                    {log.error_message && (
                      <div className="text-xs text-destructive max-w-xs truncate">
                        {log.error_message}
                      </div>
                    )}
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
