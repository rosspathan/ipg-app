import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  Search, Download, FileText, TrendingUp, Users, Coins,
  CheckCircle, XCircle, Calendar, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MigrationRecord {
  id: string;
  user_id: string;
  username: string;
  wallet_address: string;
  amount_requested: number;
  migration_fee_bsk: number;
  net_amount_migrated: number;
  tx_hash: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default function BSKMigrationReports() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { user, isAdmin, loading: authLoading } = useAuthAdmin();

  const { data: records = [], isLoading, error } = useQuery<MigrationRecord[]>({
    queryKey: ["admin-bsk-migration-reports-v2", dateFrom, dateTo, user?.id],
    enabled: !!user && isAdmin && !authLoading,
    queryFn: async () => {
      let query = supabase
        .from("bsk_onchain_migrations")
        .select(`
          id,
          user_id,
          wallet_address,
          amount_requested,
          migration_fee_bsk,
          net_amount_migrated,
          tx_hash,
          status,
          created_at,
          completed_at
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (dateFrom) query = query.gte("created_at", startOfDay(parseISO(dateFrom)).toISOString());
      if (dateTo) query = query.lte("created_at", endOfDay(parseISO(dateTo)).toISOString());

      const { data: migData, error } = await query;
      console.log("[BSKMigrationReports] result:", { count: migData?.length, error });
      if (error) throw error;

      // Fetch usernames from profiles
      const userIds = [...new Set((migData || []).map((r: any) => r.user_id))];
      const usernameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          usernameMap[p.id] = p.username || "—";
        });
      }

      return (migData || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        username: usernameMap[r.user_id] ?? r.user_id.slice(0, 8) + "…",
        wallet_address: r.wallet_address ?? "—",
        amount_requested: r.amount_requested ?? 0,
        migration_fee_bsk: r.migration_fee_bsk ?? 0,
        net_amount_migrated: r.net_amount_migrated ?? 0,
        tx_hash: r.tx_hash ?? "—",
        status: r.status ?? "pending",
        created_at: r.created_at,
        completed_at: r.completed_at ?? null,
      }));
    },
  });

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.username.toLowerCase().includes(q) ||
      r.user_id.toLowerCase().includes(q) ||
      r.tx_hash.toLowerCase().includes(q) ||
      r.wallet_address.toLowerCase().includes(q)
    );
  });

  const totalUsers = new Set(records.map((r) => r.user_id)).size;
  const totalMigrated = records.reduce((s, r) => s + r.amount_requested, 0);
  const totalFees = records.reduce((s, r) => s + r.migration_fee_bsk, 0);
  const totalNet = records.reduce((s, r) => s + r.net_amount_migrated, 0);
  const completed = records.filter((r) => r.status === "completed").length;

  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 4 });

  const statusStyle = (status: string) => {
    if (status === "completed") return "border-[hsl(152_64%_50%/0.4)] text-[hsl(152_64%_55%)] bg-[hsl(152_64%_50%/0.08)]";
    if (status === "failed") return "border-[hsl(0_70%_60%/0.4)] text-[hsl(0_70%_65%)] bg-[hsl(0_70%_60%/0.08)]";
    return "border-[hsl(38_100%_60%/0.4)] text-[hsl(38_100%_65%)] bg-[hsl(38_100%_60%/0.08)]";
  };

  const downloadCSV = () => {
    const headers = ["#", "User ID", "Username", "Wallet", "Amount BSK", "Fee BSK", "Net BSK", "TX Hash", "Status", "Date"];
    const rows = filtered.map((r, i) => [
      i + 1, r.user_id, r.username, r.wallet_address,
      r.amount_requested, r.migration_fee_bsk, r.net_amount_migrated,
      r.tx_hash, r.status,
      format(parseISO(r.created_at), "dd MMM yyyy HH:mm"),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bsk-migration-report-${format(new Date(), "yyyyMMdd")}.csv`;
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
    doc.text("BSK Migration Report", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 22);
    doc.text(`Users: ${totalUsers}  |  Migrated: ${fmt(totalMigrated)} BSK  |  Fees: ${fmt(totalFees)} BSK  |  Net: ${fmt(totalNet)} BSK`, 80, 22);
    autoTable(doc, {
      startY: 36,
      head: [["#", "User ID", "Username", "Wallet", "Amount BSK", "Fee BSK", "Net BSK", "TX Hash", "Status", "Date"]],
      body: filtered.map((r, i) => [
        i + 1,
        r.user_id.slice(0, 8) + "…",
        r.username,
        r.wallet_address.slice(0, 10) + "…",
        fmt(r.amount_requested),
        fmt(r.migration_fee_bsk),
        fmt(r.net_amount_migrated),
        r.tx_hash.slice(0, 12) + "…",
        r.status,
        format(parseISO(r.created_at), "dd MMM yy"),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [88, 56, 255], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 244, 255] },
      foot: [["", "", "", "TOTALS", fmt(totalMigrated), fmt(totalFees), fmt(totalNet), "", "", ""]],
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
    doc.save(`bsk-migration-report-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const statCards = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-[hsl(262_100%_72%)]" },
    { label: "Total Migrated", value: `${fmt(totalMigrated)} BSK`, icon: Coins, color: "text-[hsl(152_64%_50%)]" },
    { label: "Total Fees", value: `${fmt(totalFees)} BSK`, icon: TrendingUp, color: "text-[hsl(38_100%_60%)]" },
    { label: "Completed", value: completed, icon: CheckCircle, color: "text-[hsl(152_64%_50%)]" },
  ];

  if (authLoading) {
    return <div className="flex items-center justify-center h-64 text-[hsl(240_10%_50%)]">Verifying admin session…</div>;
  }

  return (
    <div className="space-y-5 pb-6">
      {error && (
        <div className="border border-destructive/30 rounded-xl p-4 text-destructive text-sm bg-destructive/10">
          Error: {(error as any)?.message || "Unknown error"}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(0_0%_98%)]">BSK Migration Reports</h1>
          <p className="text-sm text-[hsl(240_10%_60%)] mt-0.5">On-chain migration summary & user breakdown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}
            className="border-[hsl(235_20%_25%)] text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={downloadPDF}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_58%)] text-white gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[hsl(240_10%_55%)] uppercase tracking-wide">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="text-lg sm:text-xl font-bold text-[hsl(0_0%_98%)] truncate">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_10%_50%)]" />
          <Input
            placeholder="Search by username, user ID, TX hash, wallet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_10%_45%)]"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="h-4 w-4 text-[hsl(240_10%_50%)] shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] w-36"
          />
          <span className="text-[hsl(240_10%_45%)] text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] w-36"
          />
        </div>
        <p className="text-xs text-[hsl(240_10%_45%)]">
          Showing {filtered.length} of {records.length} records
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-[hsl(240_10%_50%)]">Loading migration data…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[hsl(240_10%_50%)]">No migration records found</div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(235_20%_22%/0.20)] bg-[hsl(235_28%_10%)]">
                    {["#", "User", "Wallet", "Amount BSK", "Fee BSK", "Net BSK", "TX Hash", "Status", "Date"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[hsl(240_10%_50%)] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="border-b border-[hsl(235_20%_22%/0.10)] hover:bg-[hsl(235_28%_15%)] transition-colors">
                      <td className="px-4 py-3 text-[hsl(240_10%_50%)] text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[hsl(0_0%_95%)] text-xs">{r.username}</p>
                        <p className="text-[hsl(240_10%_50%)] text-[10px] font-mono">{r.user_id.slice(0, 12)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.wallet_address !== "—" ? (
                          <span className="font-mono text-[10px] text-[hsl(240_10%_55%)]">
                            {r.wallet_address.slice(0, 8)}…{r.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <XCircle className="h-4 w-4 text-[hsl(0_70%_60%)]" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[hsl(0_0%_95%)] font-mono text-xs">{fmt(r.amount_requested)}</td>
                      <td className="px-4 py-3 text-[hsl(38_100%_65%)] font-mono text-xs">{fmt(r.migration_fee_bsk)}</td>
                      <td className="px-4 py-3 text-[hsl(152_64%_55%)] font-mono text-xs font-semibold">{fmt(r.net_amount_migrated)}</td>
                      <td className="px-4 py-3">
                        {r.tx_hash !== "—" ? (
                          <a
                            href={`https://bscscan.com/tx/${r.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-[10px] text-[hsl(262_100%_72%)] hover:text-[hsl(262_100%_85%)] transition-colors"
                          >
                            {r.tx_hash.slice(0, 8)}…
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[hsl(240_10%_40%)] text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${statusStyle(r.status)} text-[10px]`}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[hsl(240_10%_55%)] text-xs whitespace-nowrap">
                        {format(parseISO(r.created_at), "dd MMM yy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[hsl(235_28%_10%)] border-t border-[hsl(235_20%_22%/0.20)]">
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold text-[hsl(0_0%_80%)]">TOTALS</td>
                    <td className="px-4 py-3 text-xs font-bold text-[hsl(262_100%_72%)] font-mono">{fmt(totalMigrated)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[hsl(38_100%_65%)] font-mono">{fmt(totalFees)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[hsl(152_64%_55%)] font-mono">{fmt(totalNet)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((r, i) => (
              <div key={r.id} className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden">
                {/* Card Header */}
                <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[hsl(235_20%_22%/0.15)]">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[hsl(0_0%_95%)] truncate">{r.username}</p>
                    <p className="text-[10px] text-[hsl(240_10%_50%)] font-mono mt-0.5">
                      {r.wallet_address !== "—" ? `${r.wallet_address.slice(0, 8)}…${r.wallet_address.slice(-4)}` : "No wallet"}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${statusStyle(r.status)} text-[10px] shrink-0 ml-2`}>
                    {r.status}
                  </Badge>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 px-4 py-3">
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Amount</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(0_0%_95%)]">{fmt(r.amount_requested)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Fee</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(38_100%_65%)]">{fmt(r.migration_fee_bsk)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase tracking-wide">Net BSK</p>
                    <p className="text-sm font-mono font-semibold text-[hsl(152_64%_55%)]">{fmt(r.net_amount_migrated)}</p>
                  </div>
                </div>

                {/* TX Hash + Date */}
                <div className="flex items-center justify-between px-4 pb-3">
                  {r.tx_hash !== "—" ? (
                    <a
                      href={`https://bscscan.com/tx/${r.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[10px] text-[hsl(262_100%_72%)] hover:text-[hsl(262_100%_85%)]"
                    >
                      TX: {r.tx_hash.slice(0, 10)}…
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-[hsl(240_10%_40%)]">No TX hash</span>
                  )}
                  <span className="text-[10px] text-[hsl(240_10%_50%)]">
                    {format(parseISO(r.created_at), "dd MMM yyyy")}
                  </span>
                </div>
              </div>
            ))}

            {/* Mobile Totals */}
            <div className="bg-[hsl(235_28%_10%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-4">
              <p className="text-xs font-bold text-[hsl(0_0%_80%)] mb-3 uppercase tracking-wide">Grand Totals</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase">Migrated</p>
                  <p className="text-sm font-mono font-bold text-[hsl(262_100%_72%)]">{fmt(totalMigrated)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase">Fees</p>
                  <p className="text-sm font-mono font-bold text-[hsl(38_100%_65%)]">{fmt(totalFees)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(240_10%_45%)] uppercase">Net</p>
                  <p className="text-sm font-mono font-bold text-[hsl(152_64%_55%)]">{fmt(totalNet)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
