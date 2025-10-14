import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ReportViewerProps {
  reportData: any;
  reportType: string;
  isLoading: boolean;
}

export function ReportViewer({ reportData, reportType, isLoading }: ReportViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for selected date range
      </div>
    );
  }

  const renderDailyOpsReport = () => {
    const summary = reportData.summary || {};
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Deposits</p>
              <p className="text-2xl font-bold">{summary.total_deposits || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Deposit Amount</p>
              <p className="text-2xl font-bold">
                ₹{Number(summary.total_deposit_amount || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Withdrawals</p>
              <p className="text-2xl font-bold">{summary.total_withdrawals || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Withdrawal Amount</p>
              <p className="text-2xl font-bold">
                ₹{Number(summary.total_withdrawal_amount || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Recent Deposits</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.deposits?.slice(0, 10).map((deposit: any) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      {format(new Date(deposit.created_at), "PPP")}
                    </TableCell>
                    <TableCell>₹{Number(deposit.amount).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{deposit.method}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          deposit.status === "approved"
                            ? "bg-success/20 text-success"
                            : deposit.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : "bg-danger/20 text-danger"
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderUserActivityReport = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">New Users</p>
          <p className="text-3xl font-bold">{reportData.new_users || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Active Users</p>
          <p className="text-3xl font-bold">{reportData.active_users || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Users</p>
          <p className="text-3xl font-bold">{reportData.total_users || 0}</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrencyFlowReport = () => {
    const bsk = reportData.bsk_metrics || {};
    const inr = reportData.inr_metrics || {};
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">BSK Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Supply</p>
                <p className="text-2xl font-bold">
                  {Number(bsk.total_supply || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Withdrawable</p>
                <p className="text-2xl font-bold">
                  {Number(bsk.withdrawable || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Holding</p>
                <p className="text-2xl font-bold">
                  {Number(bsk.holding || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">INR Metrics</h3>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">
                ₹{Number(inr.total_balance || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  switch (reportType) {
    case "daily_ops":
      return renderDailyOpsReport();
    case "user_activity":
      return renderUserActivityReport();
    case "currency_flow":
      return renderCurrencyFlowReport();
    default:
      return (
        <div className="text-center py-8 text-muted-foreground">
          Report type not supported
        </div>
      );
  }
}
