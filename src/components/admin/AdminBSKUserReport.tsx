import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, RefreshCw, Search, FileText, Download, Wallet, Lock, ArrowDownToLine, Clock, CheckCircle2, Coins,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { generateUserBskReportPDF } from "@/lib/generateUserBskReport";

export interface BskUserRow {
  username: string;
  email: string;
  wallet_status: string;
  wallet_address: string;
  withdrawable_balance: number;
  holding_balance: number;
  total_balance: number;
  total_held: number;
  total_earned: number;
  total_deducted: number;
  fees_paid: number;
  pending_withdrawals_count: number;
  pending_withdrawals_amount: number;
  completed_withdrawals_count: number;
  completed_withdrawals_amount: number;
  created_at: string;
}

interface ReportResponse {
  success: boolean;
  total_users: number;
  generated_at: string;
  totals: Record<string, number>;
  data: BskUserRow[];
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function AdminBSKUserReport() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-bsk-user-report"],
    queryFn: async (): Promise<ReportResponse> => {
      const { data, error } = await supabase.functions.invoke("admin-user-bsk-report");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to load report");
      return data as ReportResponse;
    },
  });

  const rows = data?.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.wallet_address.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = data?.totals;

  const handlePdf = async () => {
    setGeneratingPdf(true);
    try {
      generateUserBskReportPDF(rows, data?.generated_at || new Date().toISOString());
      toast({ title: "PDF Generated", description: `${rows.length} users exported.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "PDF Failed", description: err.message });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCsv = () => {
    const headers = [
      "Username", "Email", "Wallet Status", "Wallet Address",
      "Withdrawable BSK", "Locked/Holding BSK", "Total Held BSK", "Total Earned BSK",
      "Total Deducted BSK", "Fees/Deductions BSK",
      "Pending Withdrawals (Count)", "Pending Withdrawals (BSK)",
      "Completed Withdrawals (Count)", "Completed Withdrawals (BSK)", "Joined",
    ];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csvRows = rows.map((r) => [
      r.username, r.email, r.wallet_status, r.wallet_address,
      r.withdrawable_balance, r.holding_balance, r.total_held, r.total_earned,
      r.total_deducted, r.fees_paid,
      r.pending_withdrawals_count, r.pending_withdrawals_amount,
      r.completed_withdrawals_count, r.completed_withdrawals_amount,
      r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "",
    ].map(escape).join(","));
    const csv = [headers.map(escape).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bsk-user-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: "Total Withdrawable", value: totals?.withdrawable_balance, icon: Wallet, color: "text-emerald-500" },
    { label: "Locked / Holding", value: totals?.holding_balance, icon: Lock, color: "text-amber-500" },
    { label: "Total BSK Held", value: totals?.total_held, icon: Coins, color: "text-primary" },
    { label: "Pending Withdrawals", value: totals?.pending_withdrawals_amount, icon: Clock, color: "text-blue-500" },
    { label: "Completed Withdrawals", value: totals?.completed_withdrawals_amount, icon: CheckCircle2, color: "text-green-600" },
    { label: "Fees / Deductions", value: totals?.fees_paid, icon: ArrowDownToLine, color: "text-red-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Header / actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Complete BSK Report (Per User)</h2>
          <p className="text-sm text-muted-foreground">
            Held, locked, withdrawable, withdrawals and fees — accurate &amp; verifiable.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsv} disabled={!rows.length}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" onClick={handlePdf} disabled={!rows.length || generatingPdf}>
            {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold font-mono">{fmt(c.value || 0)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, email or wallet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading per-user BSK data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Withdrawable</TableHead>
                    <TableHead className="text-right">Locked</TableHead>
                    <TableHead className="text-right">Total Held</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                    <TableHead className="text-right">Pending W/D</TableHead>
                    <TableHead className="text-right">Completed W/D</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead>Wallet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={`${r.email}-${idx}`}>
                      <TableCell>
                        <div className="font-medium">{r.username}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(r.withdrawable_balance)}</TableCell>
                      <TableCell className="text-right font-mono text-amber-600">{fmt(r.holding_balance)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(r.total_held)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{fmt(r.total_earned)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(r.pending_withdrawals_amount)}
                        {r.pending_withdrawals_count > 0 && (
                          <span className="text-xs text-muted-foreground"> ({r.pending_withdrawals_count})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(r.completed_withdrawals_amount)}
                        {r.completed_withdrawals_count > 0 && (
                          <span className="text-xs text-muted-foreground"> ({r.completed_withdrawals_count})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-500">{fmt(r.fees_paid)}</TableCell>
                      <TableCell>
                        <Badge variant={r.wallet_status === "Created" ? "default" : "secondary"} className="text-xs">
                          {r.wallet_status === "Created" ? "Created" : "None"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        {search ? "No users match your search." : "No BSK data available."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {rows.length} users · Generated{" "}
          {data?.generated_at ? format(new Date(data.generated_at), "PPpp") : "—"}
        </p>
      )}
    </div>
  );
}

export default AdminBSKUserReport;
