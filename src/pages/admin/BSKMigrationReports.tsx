import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  Search, Download, FileText, TrendingUp, Users, Coins,
  CheckCircle, XCircle, Calendar, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MigrationRecord {
  user_id: string;
  email: string;
  username: string;
  migrated_bsk: number;
  fee_bsk: number;
  net_bsk: number;
  tx_hash: string;
  status: string;
  created_at: string;
  has_wallet: boolean;
}

export default function BSKMigrationReports() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: records = [], isLoading } = useQuery<MigrationRecord[]>({
    queryKey: ["admin-bsk-migration-reports", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("bsk_onchain_migrations")
        .select(`
          user_id,
          amount_bsk,
          fee_bsk,
          net_bsk,
          tx_hash,
          status,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (dateFrom) query = query.gte("created_at", startOfDay(parseISO(dateFrom)).toISOString());
      if (dateTo) query = query.lte("created_at", endOfDay(parseISO(dateTo)).toISOString());

      const { data: migData, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((migData || []).map((r: any) => r.user_id))];
      const profileMap: Record<string, { email: string; username: string; has_wallet: boolean }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email, wallet_address")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = {
            email: p.email || "—",
            username: p.username || "—",
            has_wallet: !!p.wallet_address,
          };
        });
      }

      return (migData || []).map((r: any) => ({
        user_id: r.user_id,
        email: profileMap[r.user_id]?.email ?? "—",
        username: profileMap[r.user_id]?.username ?? "—",
        has_wallet: profileMap[r.user_id]?.has_wallet ?? false,
        migrated_bsk: r.amount_bsk ?? 0,
        fee_bsk: r.fee_bsk ?? 0,
        net_bsk: r.net_bsk ?? (r.amount_bsk - (r.fee_bsk || 0)),
        tx_hash: r.tx_hash ?? "—",
        status: r.status ?? "completed",
        created_at: r.created_at,
      }));
    },
  });

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.email.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.user_id.toLowerCase().includes(q) ||
      r.tx_hash.toLowerCase().includes(q)
    );
  });

  const totalUsers = new Set(records.map((r) => r.user_id)).size;
  const totalMigrated = records.reduce((s, r) => s + r.migrated_bsk, 0);
  const totalFees = records.reduce((s, r) => s + r.fee_bsk, 0);
  const completed = records.filter((r) => r.status === "completed").length;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 4 });

  const downloadCSV = () => {
    const headers = ["User ID", "Email", "Username", "Has Wallet", "Migrated BSK", "Fee BSK", "Net BSK", "TX Hash", "Status", "Date"];
    const rows = filtered.map((r) => [
      r.user_id,
      r.email,
      r.username,
      r.has_wallet ? "Yes" : "No",
      r.migrated_bsk,
      r.fee_bsk,
      r.net_bsk,
      r.tx_hash,
      r.status,
      format(parseISO(r.created_at), "dd MMM yyyy HH:mm"),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bsk-migration-report-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = format(new Date(), "dd MMM yyyy HH:mm");

    // Header
    doc.setFillColor(38, 33, 74);
    doc.rect(0, 0, 297, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BSK Migration Report", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 22);
    doc.text(`Total Users: ${totalUsers}  |  Total Migrated: ${fmt(totalMigrated)} BSK  |  Fees: ${fmt(totalFees)} BSK`, 100, 22);

    // Table
    autoTable(doc, {
      startY: 36,
      head: [["#", "User ID", "Email", "Username", "Wallet", "Migrated BSK", "Fee BSK", "Net BSK", "Status", "Date"]],
      body: filtered.map((r, i) => [
        i + 1,
        r.user_id.slice(0, 8) + "…",
        r.email,
        r.username,
        r.has_wallet ? "Yes" : "No",
        fmt(r.migrated_bsk),
        fmt(r.fee_bsk),
        fmt(r.net_bsk),
        r.status,
        format(parseISO(r.created_at), "dd MMM yyyy"),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [88, 56, 255], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 244, 255] },
      foot: [[
        "", "", "", "", "TOTALS",
        fmt(totalMigrated),
        fmt(totalFees),
        fmt(totalMigrated - totalFees),
        "", "",
      ]],
      footStyles: { fillColor: [38, 33, 74], textColor: 255, fontStyle: "bold" },
    });

    // Footer
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

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(0_0%_98%)]">BSK Migration Reports</h1>
          <p className="text-sm text-[hsl(240_10%_60%)] mt-0.5">On-chain migration summary & user breakdown</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCSV}
            className="border-[hsl(235_20%_25%)] text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] gap-2"
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            size="sm"
            onClick={downloadPDF}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_58%)] text-white gap-2"
          >
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
      <div className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_10%_50%)]" />
            <Input
              placeholder="Search by email, username, user ID, TX hash…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(235_28%_10%)] border-[hsl(235_20%_22%/0.30)] text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_10%_45%)]"
            />
          </div>
          <div className="flex gap-2 items-center">
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
        </div>
        <p className="text-xs text-[hsl(240_10%_45%)] mt-2">
          Showing {filtered.length} of {records.length} records
        </p>
      </div>

      {/* Table */}
      <div className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%/0.20)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(235_20%_22%/0.20)] bg-[hsl(235_28%_10%)]">
                {["#", "User", "Has Wallet", "Migrated BSK", "Fee BSK", "Net BSK", "TX Hash", "Status", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[hsl(240_10%_50%)] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[hsl(240_10%_50%)]">
                    Loading migration data…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[hsl(240_10%_50%)]">
                    No migration records found
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.user_id + i} className="border-b border-[hsl(235_20%_22%/0.10)] hover:bg-[hsl(235_28%_15%)] transition-colors">
                    <td className="px-4 py-3 text-[hsl(240_10%_50%)] text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[hsl(0_0%_95%)] text-xs">{r.username}</p>
                      <p className="text-[hsl(240_10%_50%)] text-[10px] truncate max-w-[140px]">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.has_wallet ? (
                        <CheckCircle className="h-4 w-4 text-[hsl(152_64%_50%)]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[hsl(0_70%_60%)]" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[hsl(0_0%_95%)] font-mono text-xs">{fmt(r.migrated_bsk)}</td>
                    <td className="px-4 py-3 text-[hsl(38_100%_65%)] font-mono text-xs">{fmt(r.fee_bsk)}</td>
                    <td className="px-4 py-3 text-[hsl(152_64%_55%)] font-mono text-xs font-semibold">{fmt(r.net_bsk)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-[hsl(240_10%_55%)] truncate block max-w-[100px]">
                        {r.tx_hash !== "—" ? r.tx_hash.slice(0, 10) + "…" : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          r.status === "completed"
                            ? "border-[hsl(152_64%_50%/0.4)] text-[hsl(152_64%_55%)] bg-[hsl(152_64%_50%/0.08)] text-[10px]"
                            : "border-[hsl(38_100%_60%/0.4)] text-[hsl(38_100%_65%)] bg-[hsl(38_100%_60%/0.08)] text-[10px]"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(240_10%_55%)] text-xs whitespace-nowrap">
                      {format(parseISO(r.created_at), "dd MMM yy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[hsl(235_28%_10%)] border-t border-[hsl(235_20%_22%/0.20)]">
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold text-[hsl(0_0%_80%)]">TOTALS</td>
                  <td className="px-4 py-3 text-xs font-bold text-[hsl(262_100%_72%)] font-mono">{fmt(totalMigrated)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-[hsl(38_100%_65%)] font-mono">{fmt(totalFees)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-[hsl(152_64%_55%)] font-mono">{fmt(totalMigrated - totalFees)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
