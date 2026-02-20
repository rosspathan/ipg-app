import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
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
import autoTable from "jspdf-autotable";

interface LoanRecord {
  id: string;
  user_id: string;
  loan_number: string;
  email: string;
  username: string;
  principal_bsk: number;
  paid_bsk: number;
  outstanding_bsk: number;
  total_due_bsk: number;
  tenor_weeks: number;
  status: string;
  applied_at: string;
  installments_paid: number;
  installments_total: number;
}

interface Installment {
  id: string;
  installment_number: number;
  total_due_bsk: number;
  paid_bsk: number;
  paid_at: string | null;
  due_date: string;
  status: string;
}

function InstallmentDetail({ loanLabel, installments, isLoading, fmt, installmentStatusBadge }: {
  loanLabel: string;
  installments: Installment[];
  isLoading: boolean;
  fmt: (n: number) => string;
  installmentStatusBadge: (s: string) => string;
}) {
  if (isLoading) return <p className="text-xs text-[hsl(240_10%_50%)] py-2">Loading…</p>;
  if (installments.length === 0) return <p className="text-xs text-[hsl(240_10%_50%)] py-2">No installment records found</p>;
  return (
    <div>
      <p className="text-xs font-semibold text-[hsl(262_100%_72%)] mb-3 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        Payment History – {loanLabel}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-[hsl(235_20%_22%/0.20)] rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[hsl(235_28%_13%)] text-[hsl(240_10%_50%)]">
              <th className="px-3 py-2 text-left">EMI #</th>
              <th className="px-3 py-2 text-left">Due Date</th>
              <th className="px-3 py-2 text-left">Due (BSK)</th>
              <th className="px-3 py-2 text-left">Paid (BSK)</th>
              <th className="px-3 py-2 text-left">Paid At</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => (
              <tr key={inst.id} className="border-t border-[hsl(235_20%_22%/0.15)]">
                <td className="px-3 py-2 text-[hsl(0_0%_80%)]">#{inst.installment_number}</td>
                <td className="px-3 py-2 text-[hsl(240_10%_55%)]">{format(parseISO(inst.due_date), "dd MMM yyyy")}</td>
                <td className="px-3 py-2 font-mono text-[hsl(0_0%_80%)]">{fmt(inst.total_due_bsk ?? 0)}</td>
                <td className="px-3 py-2 font-mono text-[hsl(152_64%_55%)]">{fmt(inst.paid_bsk ?? 0)}</td>
                <td className="px-3 py-2 text-[hsl(240_10%_55%)]">
                  {inst.paid_at ? format(parseISO(inst.paid_at), "dd MMM yyyy HH:mm") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`flex items-center gap-1 ${installmentStatusBadge(inst.status)}`}>
                    {inst.status === "paid" ? <CheckCircle className="h-3 w-3" /> : inst.status === "overdue" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {inst.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BSKLoanReports() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const { user, isAdmin, loading: authLoading } = useAuthAdmin();

  const { data: loans = [], isLoading, error: loansError } = useQuery<LoanRecord[]>({
    queryKey: ["admin-bsk-loan-reports", user?.id],
    // Only fetch when admin session is confirmed
    enabled: !!user && isAdmin && !authLoading,

    queryFn: async () => {
      // Query the correct table: bsk_loans (not bsk_loan_applications)
      const { data: loanData, error } = await supabase
        .from("bsk_loans")
        .select("id, loan_number, user_id, principal_bsk, paid_bsk, outstanding_bsk, total_due_bsk, tenor_weeks, status, applied_at")
        .order("applied_at", { ascending: false });
      console.log("[BSKLoanReports] bsk_loans result:", { count: loanData?.length, error });
      if (error) throw error;

      // Fetch installment counts per loan
      const loanIds = (loanData || []).map((l: any) => l.id);
      let installmentCounts: Record<string, { paid: number; total: number }> = {};
      if (loanIds.length > 0) {
        const { data: instData } = await supabase
          .from("bsk_loan_installments")
          .select("loan_id, status")
          .in("loan_id", loanIds);
        (instData || []).forEach((inst: any) => {
          if (!installmentCounts[inst.loan_id]) {
            installmentCounts[inst.loan_id] = { paid: 0, total: 0 };
          }
          installmentCounts[inst.loan_id].total++;
          if (inst.status === "paid") installmentCounts[inst.loan_id].paid++;
        });
      }

      // Fetch user profiles
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

      return (loanData || []).map((l: any) => ({
        id: l.id,
        user_id: l.user_id,
        loan_number: l.loan_number || "—",
        email: profileMap[l.user_id]?.email ?? "—",
        username: profileMap[l.user_id]?.username ?? "—",
        principal_bsk: l.principal_bsk ?? 0,
        paid_bsk: l.paid_bsk ?? 0,
        outstanding_bsk: l.outstanding_bsk ?? 0,
        total_due_bsk: l.total_due_bsk ?? l.principal_bsk ?? 0,
        tenor_weeks: l.tenor_weeks ?? 16,
        status: l.status,
        applied_at: l.applied_at,
        installments_paid: installmentCounts[l.id]?.paid ?? 0,
        installments_total: installmentCounts[l.id]?.total ?? (l.tenor_weeks ?? 16),
      }));
    },
  });

  // Installments for expanded loan — from the correct table
  const { data: installments = [], isLoading: installmentsLoading } = useQuery<Installment[]>({
    queryKey: ["admin-loan-installments", expandedLoan],
    enabled: !!expandedLoan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loan_installments")
        .select("id, installment_number, total_due_bsk, paid_bsk, paid_at, due_date, status")
        .eq("loan_id", expandedLoan!)
        .order("installment_number", { ascending: true });
      if (error) throw error;
      return (data || []) as Installment[];
    },
  });

  const filtered = loans.filter((l) => {
    const matchesSearch =
      !search ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.user_id.toLowerCase().includes(search.toLowerCase()) ||
      l.loan_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Aggregate from real bsk_loans data
  const totalIssued = loans.reduce((s, l) => s + l.principal_bsk, 0);
  const totalCollected = loans.reduce((s, l) => s + l.paid_bsk, 0);
  const totalPending = loans.reduce((s, l) => s + l.outstanding_bsk, 0);
  const activeCount = loans.filter((l) => ["active", "overdue", "in_arrears"].includes(l.status)).length;
  const closedCount = loans.filter((l) => ["completed", "closed", "forfeited"].includes(l.status)).length;

  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const downloadCSV = () => {
    const headers = ["#", "Loan #", "Username", "Email", "Principal BSK", "Paid BSK", "Outstanding BSK", "EMI Paid", "Total EMI", "Status", "Applied"];
    const rows = filtered.map((l, i) => [
      i + 1, l.loan_number, l.username, l.email,
      fmt(l.principal_bsk), fmt(l.paid_bsk), fmt(l.outstanding_bsk),
      l.installments_paid, l.installments_total, l.status,
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
    doc.text(`Loans: ${loans.length}  |  Issued: ${fmt(totalIssued)} BSK  |  Collected: ${fmt(totalCollected)} BSK  |  Pending: ${fmt(totalPending)} BSK`, 80, 22);

    autoTable(doc, {
      startY: 36,
      head: [["#", "Loan #", "Username", "Email", "Principal BSK", "Paid BSK", "Outstanding", "EMI Paid", "Total EMI", "Status", "Applied"]],
      body: filtered.map((l, i) => [
        i + 1, l.loan_number, l.username, l.email,
        fmt(l.principal_bsk), fmt(l.paid_bsk), fmt(l.outstanding_bsk),
        l.installments_paid, l.installments_total, l.status,
        format(parseISO(l.applied_at), "dd MMM yy"),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [88, 56, 255], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 244, 255] },
      foot: [["", "", "", "TOTALS", fmt(totalIssued), fmt(totalCollected), fmt(totalPending), "", "", "", ""]],
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
      overdue: "border-[hsl(38_100%_60%/0.4)] text-[hsl(38_100%_65%)] bg-[hsl(38_100%_60%/0.08)]",
      in_arrears: "border-[hsl(0_70%_60%/0.4)] text-[hsl(0_70%_65%)] bg-[hsl(0_70%_60%/0.08)]",
      completed: "border-[hsl(240_10%_50%/0.4)] text-[hsl(240_10%_55%)] bg-[hsl(240_10%_50%/0.08)]",
      closed: "border-[hsl(240_10%_50%/0.4)] text-[hsl(240_10%_55%)] bg-[hsl(240_10%_50%/0.08)]",
      forfeited: "border-[hsl(0_70%_60%/0.4)] text-[hsl(0_70%_65%)] bg-[hsl(0_70%_60%/0.08)]",
      pending: "border-[hsl(38_100%_60%/0.4)] text-[hsl(38_100%_65%)] bg-[hsl(38_100%_60%/0.08)]",
    };
    return map[status] || map["pending"];
  };

  const installmentStatusBadge = (status: string) => {
    if (status === "paid") return "text-[hsl(152_64%_55%)]";
    if (status === "overdue") return "text-[hsl(0_70%_65%)]";
    return "text-[hsl(38_100%_65%)]";
  };

  const kpiCards = [
    { label: "Total Loans", value: loans.length, icon: Users, color: "text-[hsl(262_100%_72%)]" },
    { label: "Active Loans", value: activeCount, icon: TrendingUp, color: "text-[hsl(152_64%_50%)]" },
    { label: "Closed / Forfeited", value: closedCount, icon: CheckCircle, color: "text-[hsl(240_10%_55%)]" },
    { label: "Total Issued", value: `${fmt(totalIssued)} BSK`, icon: DollarSign, color: "text-[hsl(38_100%_60%)]" },
    { label: "Total Collected", value: `${fmt(totalCollected)} BSK`, icon: Wallet, color: "text-[hsl(152_64%_50%)]" },
    { label: "Outstanding", value: `${fmt(totalPending)} BSK`, icon: BarChart3, color: "text-[hsl(0_70%_60%)]" },
  ];

  if (authLoading) {
    return <div className="flex items-center justify-center h-64 text-[hsl(240_10%_50%)]">Verifying admin session…</div>;
  }

  return (
    <div className="space-y-5 pb-6">
      {loansError && (
        <div className="border border-destructive/30 rounded-xl p-4 text-destructive text-sm bg-destructive/10">
          Error loading loans: {(loansError as any)?.message || "Unknown error"}
        </div>
      )}
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
              placeholder="Search by email, username, user ID or loan #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_10%_45%)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "active", "overdue", "in_arrears", "completed", "forfeited"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-[hsl(262_100%_65%)] text-white"
                    : "bg-[hsl(235_28%_10%)] text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_90%)] border border-[hsl(235_20%_22%/0.30)]"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[hsl(240_10%_45%)] mt-2">
          Showing {filtered.length} of {loans.length} loans
        </p>
      </div>

      {/* Loans — Desktop Table / Mobile Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-[hsl(240_10%_50%)]">Loading loan data…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[hsl(240_10%_50%)]">No loan records found</div>
      ) : (
        <>
          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="hidden md:block bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(235_20%_22%/0.20)] bg-[hsl(235_28%_10%)]">
                    {["#", "Member", "Loan #", "Principal BSK", "Status", "EMI Paid", "Total Paid", "Outstanding", "Date", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[hsl(240_10%_50%)] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <>
                      <tr key={l.id} className="border-b border-[hsl(235_20%_22%/0.10)] hover:bg-[hsl(235_28%_15%)] transition-colors">
                        <td className="px-4 py-3 text-[hsl(240_10%_50%)] text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[hsl(0_0%_95%)] text-xs">{l.username}</p>
                          <p className="text-[hsl(240_10%_50%)] text-[10px] truncate max-w-[130px]">{l.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[hsl(240_10%_55%)] font-mono text-[10px]">{l.loan_number}</td>
                        <td className="px-4 py-3 text-[hsl(0_0%_95%)] font-mono text-xs">{fmt(l.principal_bsk)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${statusBadge(l.status)} text-[10px]`}>
                            {l.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[hsl(0_0%_95%)] text-xs">
                          {l.installments_paid}/{l.installments_total}
                        </td>
                        <td className="px-4 py-3 text-[hsl(152_64%_55%)] font-mono text-xs">{fmt(l.paid_bsk)}</td>
                        <td className="px-4 py-3 text-[hsl(0_70%_65%)] font-mono text-xs">{fmt(l.outstanding_bsk)}</td>
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
                      {expandedLoan === l.id && (
                        <tr key={`${l.id}-exp`} className="bg-[hsl(235_28%_10%)]">
                          <td colSpan={10} className="px-4 py-4">
                            <InstallmentDetail
                              loanLabel={`${l.username} (${l.loan_number})`}
                              installments={installments}
                              isLoading={installmentsLoading}
                              fmt={fmt}
                              installmentStatusBadge={installmentStatusBadge}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards (hidden on md+) ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((l, i) => (
              <div
                key={l.id}
                className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[hsl(235_20%_22%/0.15)]">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[hsl(0_0%_95%)] truncate">{l.username}</p>
                    <p className="text-[10px] text-[hsl(240_10%_50%)] truncate mt-0.5">{l.loan_number}</p>
                  </div>
                  <Badge variant="outline" className={`${statusBadge(l.status)} text-[10px] shrink-0 ml-2`}>
                    {l.status.replace("_", " ")}
                  </Badge>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3">
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Principal</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(0_0%_95%)]">{fmt(l.principal_bsk)} BSK</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">EMI Progress</p>
                    <p className="text-sm font-semibold text-[hsl(0_0%_95%)]">
                      {l.installments_paid}
                      <span className="text-[hsl(240_10%_50%)] text-xs font-normal"> / {l.installments_total}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Total Paid</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(152_64%_55%)]">{fmt(l.paid_bsk)} BSK</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Outstanding</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(0_70%_65%)]">{fmt(l.outstanding_bsk)} BSK</p>
                  </div>
                </div>

                {/* View History toggle */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setExpandedLoan(expandedLoan === l.id ? null : l.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[hsl(262_100%_65%/0.10)] border border-[hsl(262_100%_65%/0.20)] text-[hsl(262_100%_72%)] text-xs font-medium hover:bg-[hsl(262_100%_65%/0.18)] transition-colors"
                  >
                    {expandedLoan === l.id ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Hide Payment History</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> View Payment History</>
                    )}
                  </button>

                  {expandedLoan === l.id && (
                    <div className="mt-3">
                      <InstallmentDetail
                        loanLabel={`${l.username} (${l.loan_number})`}
                        installments={installments}
                        isLoading={installmentsLoading}
                        fmt={fmt}
                        installmentStatusBadge={installmentStatusBadge}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
