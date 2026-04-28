/**
 * Admin Verified Users — full directory of users whose KYC is fully approved
 * (all 4 pillars). Mobile-first card grid, search, totals, and a detail sheet
 * with all submitted info + per-action diagnostics.
 *
 * Source of truth: useVerifiedKYCUsers (kyc_admin_summary, filtered to all
 * 4 pillars = approved).
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ShieldCheck, Search, RefreshCw, User2, Mail, Phone, Calendar,
  FileText, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifiedKYCUsers, type VerifiedKYCUser } from "@/hooks/useVerifiedKYCUsers";
import { KycDiagnosticsPanel } from "@/components/admin/kyc/KycDiagnosticsPanel";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  tone = "emerald",
}: {
  label: string;
  value: number;
  tone?: "emerald" | "sky" | "violet" | "amber";
}) {
  const toneClass = {
    emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    sky: "from-sky-500/15 to-sky-500/5 border-sky-500/20",
    violet: "from-violet-500/15 to-violet-500/5 border-violet-500/20",
    amber: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  }[tone];
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-3", toneClass)}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

function UserRow({
  u,
  onSelect,
}: {
  u: VerifiedKYCUser;
  onSelect: () => void;
}) {
  const name =
    u.full_name_computed ||
    u.display_name ||
    u.username ||
    u.email_computed ||
    u.user_id.slice(0, 8);
  const email = u.email_computed || u.profile_email;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group block w-full text-left rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-500/15 p-2 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-semibold text-sm">{name}</span>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            >
              Verified
            </Badge>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {email ?? u.user_id}
          </div>
          {u.final_approved_at && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Approved {format(new Date(u.final_approved_at), "MMM d, yyyy 'at' HH:mm")}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function DetailSheet({
  user,
  open,
  onOpenChange,
}: {
  user: VerifiedKYCUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!user) return null;
  const data = user.data_json ?? {};
  const name =
    user.full_name_computed ||
    user.display_name ||
    user.username ||
    user.email_computed ||
    user.user_id.slice(0, 8);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="rounded-full bg-emerald-500/15 p-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email_computed ?? user.user_id}
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
            All 4 pillars
          </Badge>
        </div>

        <div className="space-y-3 p-4">
          {/* Profile */}
          <Card className="border-border/60">
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Profile
              </div>
              <Field icon={User2} label="Full name" value={name} />
              <Field icon={Mail} label="Email" value={user.email_computed ?? user.profile_email} />
              <Field icon={Phone} label="Phone" value={user.phone_computed} />
              <Field label="Username" value={user.username} />
              <Field label="User ID" value={user.user_id} mono />
              <Field label="Date of birth" value={data.date_of_birth} />
              <Field label="Nationality" value={data.nationality} />
              <Field
                label="Address"
                value={[
                  data.address_line1,
                  data.address_line2,
                  data.city,
                  data.state,
                  data.postal_code,
                  data.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            </CardContent>
          </Card>

          {/* Approval timeline */}
          <Card className="border-border/60">
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Approval
              </div>
              <Field
                icon={CheckCircle2}
                label="Final approved at"
                value={
                  user.final_approved_at
                    ? format(new Date(user.final_approved_at), "PPp")
                    : "—"
                }
              />
              <Field
                label="Approved by"
                value={user.final_approved_by ?? "—"}
                mono
              />
              <Field
                icon={FileText}
                label="Submitted at"
                value={
                  user.submitted_at
                    ? format(new Date(user.submitted_at), "PPp")
                    : "—"
                }
              />
            </CardContent>
          </Card>

          {/* Diagnostics — proves all gates are open */}
          <KycDiagnosticsPanel userId={user.user_id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 text-right text-xs text-foreground/90 break-all",
          mono && "font-mono"
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function AdminVerifiedUsers() {
  const { data, isLoading, refetch, isFetching } = useVerifiedKYCUsers();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VerifiedKYCUser | null>(null);

  const filtered = useMemo(() => {
    const list = data?.users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const hay = [
        u.full_name_computed,
        u.display_name,
        u.username,
        u.email_computed,
        u.profile_email,
        u.phone_computed,
        u.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const stats = data?.stats ?? { total: 0, today: 0, this_week: 0, this_month: 0 };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Verified Users
            </h1>
          </div>
          <p className="hidden sm:block text-sm text-muted-foreground">
            Fully approved KYC · all 4 pillars · trading & withdrawals unlocked
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Total verified" value={stats.total} tone="emerald" />
        <StatCard label="Verified today" value={stats.today} tone="sky" />
        <StatCard label="This week" value={stats.this_week} tone="violet" />
        <StatCard label="This month" value={stats.this_month} tone="amber" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email, phone, username, user ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No verified users found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Approved users will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <UserRow key={u.id} u={u} onSelect={() => setSelected(u)} />
          ))}
          {filtered.length >= 500 && (
            <p className="text-center text-[11px] text-muted-foreground py-2">
              Showing first 500 verified users · refine your search to see more
            </p>
          )}
        </div>
      )}

      <DetailSheet
        user={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
