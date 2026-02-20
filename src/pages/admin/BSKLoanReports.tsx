import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import {
  Search, Download, FileText, Users, DollarSign,
  CheckCircle, Clock, XCircle, ChevronDown, ChevronUp,
  TrendingUp, Wallet, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface LoanRecord {
  id: string;
  user_id: string;
  email: string;
  username: string;
  loan_amount: number;
  total_repayment: number;
  weekly_payment: number;
  duration_weeks: number;
  status: string;
  applied_at: string;
  approved_at: string | null;
  installments_paid: number;
  total_paid: number;
  outstanding: number;
}

interface Installment {
  id: string;
  installment_number: number;
  amount: number;
  paid_at: string | null;
  status: string;
  reference_id: string | null;
}

export default function BSKLoanReports() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const { data: loans = [], isLoading } = useQuery<LoanRecord[]>({
    queryKey: ["admin-bsk-loan-reports"],
    queryFn: async () => {
      const { data: loanData, error } = await supabase
        .from("bsk_loan_applications")
        .select("*")
        .order("applied_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = [...new Set((loanData || []).map((l: any) => l.user_id))];
      const profileMap: Record<string, { email: string; username: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = { email: p.email || "—", username: p.username || "—" };
        });
      }

      return (loanData || []).map((l: any) => {
        const paidInstallments = Math.round(
          (l.total_earned_bsk ?? 0) / (l.weekly_payment || 1)
        );
        const totalPaid = paidInstallments * (l.weekly_payment || 0);
        const outstanding = Math.max(0, l.total_repayment - totalPaid);

        return {
          id: l.id,
          user_id: l.user_id,
          email: profileMap[l.user_id]?.email ?? "—",
          username: profileMap[l.user_id]?.username ?? "—",
          loan_amount: l.loan_amount,
          total_repayment: l.total_repayment,
          weekly_payment: l.weekly_payment,
          duration_weeks: l.duration_weeks,
          status: l.status,
          applied_at: l.applied_at,
          approved_at: l.approved_at,
          installments_paid: paidInstallments,
          total_paid: totalPaid,
          outstanding,
        };
      });
    },
  });

  // Installments for expanded loan
  const { data: installments = [], isLoading: installmentsLoading } = useQuery<Installment[]>({
    queryKey: ["admin-loan-installments", expandedLoan],
    enabled: !!expandedLoan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_holding_ledger")
        .select("id, created_at, amount_bsk, tx_subtype, reference_id, metadata")
        .eq("reference_id", expandedLoan!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any, i: number) => ({
        id: d.id,
        installment_number: i + 1,
        amount: Math.abs(d.amount_bsk),
        paid_at: d.created_at,
        status: "paid",
        reference_id: d.reference_id,
      }));
    },
  });

  const filtered = loans.filter((l) => {
    const matchesSearch =
      !search ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.user_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalIssued = loans.reduce((s, l) => s + l.loan_amount, 0);
  const totalCollected = loans.reduce((s, l) => s + l.total_paid, 0);
  const totalPending = loans.reduce((s, l) => s + l.outstanding, 0);
  const activeCount = loans.filter((l) => l.status === "active" || l.status === "disbursed").length;
  const closedCount = loans.filter((l) => l.status === "closed" || l.status === "completed").length;

  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const downloadCSV = () => {
    const headers = ["User ID", "Email", "Username", "Loan Amount", "Total Repayment", "Weekly EMI", "Duration", "Status", "Installments Paid", "Total Paid", "Outstanding", "Applied"];
    const rows = filtered.map((l) => [
      l.user_id, l.email, l.username, l.loan_amount, l.total_repayment, l.weekly_payment,
      `${l.duration_weeks}w`, l.status, l.installments_paid, fmt(l.total_paid), fmt(l.outstanding),
      format(parseISO(l.applied_at), "dd MMM yyyy"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bsk-loan-report-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = format(new Date(), "dd MMM yyyy HH:mm");

    doc.setFillColor(38, 33, 74);
    doc.rect(0, 0, 297, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BSK Loan Summary Report", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 22);
    doc.text(`Total: ${loans.length} loans  |  Issued: ${fmt(totalIssued)} BSK  |  Collected: ${fmt(totalCollected)} BSK  |  Pending: ${fmt(totalPending)} BSK`, 80, 22);

    doc.autoTable({
      startY: 36,
      head: [["#", "User", "Email", "Loan (BSK)", "EMI", "Duration", "Status", "Paid", "Outstanding", "Applied"]],
      body: filtered.map((l, i) => [
        i + 1, l.username, l.email, fmt(l.loan_amount), fmt(l.weekly_payment),
        `${l.duration_weeks}w`, l.status, fmt(l.total_paid), fmt(l.outstanding),
        format(parseISO(l.applied_at), "dd MMM yy"),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [88, 56, 255], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 244, 255] },
      foot: [["", "", "TOTALS", fmt(totalIssued), "", "", "", fmt(totalCollected), fmt(totalPending), ""]],
      footStyles: { fillColor: [38, 33, 74], textColor: 255, fontStyle: "bold" },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("Admin Report – Confidential", 14, doc.internal.pageSize.height - 6);
      doc.text(`Page ${i} of ${pageCount}`, 270, doc.internal.pageSize.height - 6);
    }
    doc.save(`bsk-loan-report-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "border-[hsl(152_64%_50%/0.4)] text-[hsl(152_64%_55%)] bg-[hsl(152_64%_50%/0.08)]",
      disbursed: "border-[hsl(152_64%_50%/0.4)] text-[hsl(152_64%_55%)] bg-[hsl(152_64%_50%/0.08)]",
      closed: "border-[hsl(240_10%_50%/0.4)] text-[hsl(240_10%_55%)] bg-[hsl(240_10%_50%/0.08)]",
      completed: "border-[hsl(240_10%_50%/0.4)] text-[hsl(240_10%_55%)] bg-[hsl(240_10%_50%/0.08)]",
      pending: "border-[hsl(38_100%_60%/0.4)] text-[hsl(38_100%_65%)] bg-[hsl(38_100%_60%/0.08)]",
      forfeited: "border-[hsl(0_70%_60%/0.4)] text-[hsl(0_70%_65%)] bg-[hsl(0_70%_60%/0.08)]",
    };
    return map[status] || map["pending"];
  };

  const kpiCards = [
    { label: "Total Members", value: loans.length, icon: Users, color: "text-[hsl(262_100%_72%)]" },
    { label: "Active Loans", value: activeCount, icon: TrendingUp, color: "text-[hsl(152_64%_50%)]" },
    { label: "Closed Loans", value: closedCount, icon: CheckCircle, color: "text-[hsl(240_10%_55%)]" },
    { label: "Total Issued", value: `${fmt(totalIssued)} BSK`, icon: DollarSign, color: "text-[hsl(38_100%_60%)]" },
    { label: "Total Collected", value: `${fmt(totalCollected)} BSK`, icon: Wallet, color: "text-[hsl(152_64%_50%)]" },
    { label: "Pending", value: `${fmt(totalPending)} BSK`, icon: BarChart3, color: "text-[hsl(0_70%_60%)]" },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(0_0%_98%)]">BSK Loan Reports</h1>
          <p className="text-sm text-[hsl(240_10%_60%)] mt-0.5">16-week installment portfolio overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV} className="border-[hsl(235_20%_25%)] text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={downloadPDF} className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_58%)] text-white gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((c) => (
          <div key={c.label} className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[hsl(240_10%_55%)] uppercase tracking-wide leading-tight">{c.label}</p>
              <c.icon className={`h-3.5 w-3.5 ${c.color} shrink-0`} />
            </div>
            <p className="text-base font-bold text-[hsl(0_0%_98%)] truncate">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_10%_50%)]" />
            <Input
              placeholder="Search by email, username or user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_10%_45%)]"
            />
          </div>
          <div className="flex gap-2">
            {["all", "active", "disbursed", "closed", "forfeited"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-[hsl(262_100%_65%)] text-white"
                    : "bg-[hsl(235_28%_10%)] text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_90%)] border border-[hsl(235_20%_22%/0.30)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[hsl(240_10%_45%)] mt-2">
          Showing {filtered.length} of {loans.length} loans
        </p>
      </div>

      {/* Loans Table */}
      <div className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(235_20%_22%/0.20)] bg-[hsl(235_28%_10%)]">
                {["#", "Member", "Loan BSK", "Status", "EMI Paid", "Remaining", "Total Paid", "Outstanding", "Start Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[hsl(240_10%_50%)] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-[hsl(240_10%_50%)]">Loading loan data…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-[hsl(240_10%_50%)]">No loan records found</td>
                </tr>
              ) : (
                filtered.map((l, i) => (
                  <>
                    <tr
                      key={l.id}
                      className="border-b border-[hsl(235_20%_22%/0.10)] hover:bg-[hsl(235_28%_15%)] transition-colors"
                    >
                      <td className="px-4 py-3 text-[hsl(240_10%_50%)] text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[hsl(0_0%_95%)] text-xs">{l.username}</p>
                        <p className="text-[hsl(240_10%_50%)] text-[10px] truncate max-w-[130px]">{l.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[hsl(0_0%_95%)] font-mono text-xs">{fmt(l.loan_amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${statusBadge(l.status)} text-[10px]`}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[hsl(0_0%_95%)] text-xs">
                        {l.installments_paid}/{l.duration_weeks}
                      </td>
                      <td className="px-4 py-3 text-[hsl(240_10%_55%)] text-xs">
                        {Math.max(0, l.duration_weeks - l.installments_paid)}
                      </td>
                      <td className="px-4 py-3 text-[hsl(152_64%_55%)] font-mono text-xs">{fmt(l.total_paid)}</td>
                      <td className="px-4 py-3 text-[hsl(0_70%_65%)] font-mono text-xs">{fmt(l.outstanding)}</td>
                      <td className="px-4 py-3 text-[hsl(240_10%_55%)] text-xs whitespace-nowrap">
                        {format(parseISO(l.applied_at), "dd MMM yy")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedLoan(expandedLoan === l.id ? null : l.id)}
                          className="flex items-center gap-1 text-[hsl(262_100%_72%)] text-[10px] font-medium hover:text-[hsl(262_100%_85%)] transition-colors whitespace-nowrap"
                        >
                          {expandedLoan === l.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          History
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Payment History */}
                    {expandedLoan === l.id && (
                      <tr key={`${l.id}-expanded`} className="bg-[hsl(235_28%_10%)]">
                        <td colSpan={10} className="px-4 py-4">
                          <p className="text-xs font-semibold text-[hsl(262_100%_72%)] mb-3 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Payment History – {l.username}
                          </p>
                          {installmentsLoading ? (
                            <p className="text-xs text-[hsl(240_10%_50%)]">Loading…</p>
                          ) : installments.length === 0 ? (
                            <p className="text-xs text-[hsl(240_10%_50%)]">No payment records found</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-[hsl(235_20%_22%/0.20)] rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-[hsl(235_28%_13%)] text-[hsl(240_10%_50%)]">
                                    <th className="px-3 py-2 text-left">EMI #</th>
                                    <th className="px-3 py-2 text-left">Amount (BSK)</th>
                                    <th className="px-3 py-2 text-left">Payment Date</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {installments.map((inst) => (
                                    <tr key={inst.id} className="border-t border-[hsl(235_20%_22%/0.15)]">
                                      <td className="px-3 py-2 text-[hsl(0_0%_80%)]">#{inst.installment_number}</td>
                                      <td className="px-3 py-2 font-mono text-[hsl(152_64%_55%)]">{fmt(inst.amount)}</td>
                                      <td className="px-3 py-2 text-[hsl(240_10%_55%)]">
                                        {inst.paid_at ? format(parseISO(inst.paid_at), "dd MMM yyyy HH:mm") : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="flex items-center gap-1 text-[hsl(152_64%_55%)]">
                                          <CheckCircle className="h-3 w-3" /> Paid
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
