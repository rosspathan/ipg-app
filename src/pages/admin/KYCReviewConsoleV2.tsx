/**
 * Admin KYC Review Console v2 — world-class mobile-first 3-pillar review.
 *
 * Layout:
 *   - Sticky header with title + refresh
 *   - Compact stat cards (mobile: 2-col grid, desktop: 4-col)
 *   - Filter chip-row + search
 *   - User cards (mobile-first, no horizontal-scroll tables)
 *   - Tap user → full-screen Sheet with sectioned premium cards:
 *       Profile · Documents · Face · Mobile · Final · Audit
 *   - Sticky bottom decision bar with Approve / Resubmit / Reject per pillar
 *   - Reason is mandatory for Reject + Resubmit (validated in UI + RPC)
 */
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ShieldCheck, Search, RefreshCw, FileText, Camera, Phone, X, Check,
  AlertCircle, History, User2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminKYCv2,
  type KycSubmissionV2,
  type KycQueueFilter,
  type KycAuditEntry,
  type PillarStatus,
} from "@/hooks/useAdminKYCv2";
import { cn } from "@/lib/utils";
import { resolveKycSubmissionAssets } from "@/lib/kyc/resolveKycAsset";
import { KycImageViewer } from "@/components/admin/kyc/KycImageViewer";

const filterChips: {
  value: KycQueueFilter;
  label: string;
  statKey: "pendingAny" | "pendingDocs" | "pendingFace" | "pendingMobile" | "readyFinal" | "approved" | "rejected" | "suspended" | "total";
}[] = [
  { value: "pending_any", label: "Pending", statKey: "pendingAny" },
  { value: "pending_documents", label: "Docs", statKey: "pendingDocs" },
  { value: "pending_face", label: "Face", statKey: "pendingFace" },
  { value: "pending_mobile", label: "Mobile", statKey: "pendingMobile" },
  { value: "ready_final", label: "Ready", statKey: "readyFinal" },
  { value: "approved", label: "Approved", statKey: "approved" },
  { value: "rejected", label: "Rejected", statKey: "rejected" },
  { value: "all", label: "All", statKey: "total" },
];

const statusDot = (s: PillarStatus) =>
  s === "approved" ? "bg-emerald-500"
    : s === "rejected" ? "bg-rose-500"
    : s === "needs_resubmission" ? "bg-amber-500"
    : s === "pending_review" ? "bg-sky-500"
    : "bg-muted-foreground/30";

const statusLabel = (s: PillarStatus) =>
  s === "approved" ? "Approved"
    : s === "rejected" ? "Rejected"
    : s === "needs_resubmission" ? "Needs resubmit"
    : s === "pending_review" ? "Pending review"
    : "Not submitted";

const PillarBadge = ({ s, label }: { s: PillarStatus; label?: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
    <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(s))} />
    {label ?? statusLabel(s)}
  </span>
);

export default function KYCReviewConsoleV2() {
  const k = useAdminKYCv2();
  const [selected, setSelected] = useState<KycSubmissionV2 | null>(null);

  // keep selected in sync when data refreshes
  useEffect(() => {
    if (!selected) return;
    const updated = k.allSubmissions.find((s) => s.id === selected.id);
    if (updated) setSelected(updated);
    else setSelected(null);
  }, [k.allSubmissions, selected]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">KYC Review</h1>
          </div>
          <p className="hidden sm:block text-sm text-muted-foreground">
            3-pillar review · documents · face · admin-verified mobile
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={k.refetch} disabled={k.loading}>
          <RefreshCw className={cn("h-4 w-4", k.loading && "animate-spin")} />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Pending docs" value={k.stats.pendingDocs} icon={FileText} tone="amber" />
        <StatCard label="Pending face" value={k.stats.pendingFace} icon={Camera} tone="sky" />
        <StatCard label="Pending mobile" value={k.stats.pendingMobile} icon={Phone} tone="violet" />
        <StatCard label="Ready for final" value={k.stats.readyFinal} icon={ShieldCheck} tone="emerald" />
      </div>

      {/* Search + filter chips */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, user ID…"
            value={k.search}
            onChange={(e) => k.setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {filterChips.map((c) => {
            const count = k.stats[c.statKey];
            const active = k.filter === c.value;
            return (
              <button
                key={c.value}
                onClick={() => k.setFilter(c.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted/50"
                )}
              >
                {c.label}
                {count > 0 && (
                  <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue */}
      {k.loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : k.submissions.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-full bg-muted p-4">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">Nothing in this queue</p>
          <p className="text-sm text-muted-foreground">New submissions will appear here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {k.submissions.map((s) => (
            <UserCard key={s.id} sub={s} onOpen={() => setSelected(s)} />
          ))}
        </div>
      )}

      {/* Full-screen review drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 overflow-hidden data-[state=open]:duration-300 flex flex-col"
        >
          {selected && <ReviewDrawer sub={selected} k={k} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "amber" | "sky" | "violet" | "emerald" }) {
  const cls = {
    amber: "from-amber-500/10 to-background border-amber-500/20 text-amber-600",
    sky: "from-sky-500/10 to-background border-sky-500/20 text-sky-600",
    violet: "from-violet-500/10 to-background border-violet-500/20 text-violet-600",
    emerald: "from-emerald-500/10 to-background border-emerald-500/20 text-emerald-600",
  }[tone];
  return (
    <Card className={cn("relative overflow-hidden border bg-gradient-to-br p-3", cls)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide opacity-80 truncate">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        </div>
        <Icon className={cn("h-4 w-4 shrink-0", cls.split(" ").pop())} />
      </div>
    </Card>
  );
}

function UserCard({ sub, onOpen }: { sub: KycSubmissionV2; onOpen: () => void }) {
  const name = sub.full_name_computed || sub.display_name || sub.username || "Unknown user";
  const meta = sub.email_computed || sub.profile_email || sub.user_id.slice(0, 8);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.998]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{meta}</p>
            </div>
            <FinalStatusPill status={sub.final_status as any} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PillarBadge s={sub.documents_status} label={`Docs · ${statusLabel(sub.documents_status)}`} />
            <PillarBadge s={sub.face_status} label={`Face · ${statusLabel(sub.face_status)}`} />
            <PillarBadge s={sub.mobile_status} label={`Mobile · ${statusLabel(sub.mobile_status)}`} />
          </div>
        </div>
      </div>
    </button>
  );
}

function FinalStatusPill({ status }: { status: string }) {
  const cfg =
    status === "approved" ? { c: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", t: "Approved" }
      : status === "rejected" ? { c: "bg-rose-500/15 text-rose-700 dark:text-rose-400", t: "Rejected" }
      : status === "suspended" ? { c: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300", t: "Suspended" }
      : { c: "bg-amber-500/15 text-amber-700 dark:text-amber-400", t: "Pending" };
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", cfg.c)}>{cfg.t}</span>;
}

/* ============================================================
   Review drawer — premium sectioned layout, sticky decision bar
   ============================================================ */

type Pillar = "documents" | "face" | "mobile" | "final";

function ReviewDrawer({ sub, k, onClose }: { sub: KycSubmissionV2; k: ReturnType<typeof useAdminKYCv2>; onClose: () => void }) {
  const name = sub.full_name_computed || sub.display_name || sub.username || "Unknown";
  const dataJson = sub.data_json || {};

  const [assets, setAssets] = useState<{
    idFrontUrl: string | null;
    idBackUrl: string | null;
    selfieUrl: string | null;
    addressProofUrl: string | null;
  }>({ idFrontUrl: null, idBackUrl: null, selfieUrl: null, addressProofUrl: null });
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [audit, setAudit] = useState<KycAuditEntry[]>([]);

  const [activePillar, setActivePillar] = useState<Pillar>("documents");
  const [notes, setNotes] = useState("");

  // Resolve all signed URLs once whenever the selected submission changes.
  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    (async () => {
      const [resolved, a] = await Promise.all([
        resolveKycSubmissionAssets(sub.data_json, sub.face_selfie_path),
        k.fetchAudit(sub.user_id),
      ]);
      if (cancelled) return;
      setAssets(resolved);
      setAudit(a);
      setAssetsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sub.id, sub.face_selfie_path, sub.user_id, k]);

  const allGreen =
    sub.documents_status === "approved" &&
    sub.face_status === "approved" &&
    sub.mobile_status === "approved";
  const finalBlocked = activePillar === "final" && !allGreen;

  const act = async (action: "approve" | "reject" | "request_resubmission" | "suspend" | "unsuspend") => {
    if ((action === "reject" || action === "request_resubmission") && !notes.trim()) {
      toast.error("A reason is required", {
        description: "Please tell the user clearly what to fix.",
      });
      return;
    }
    if (finalBlocked && action === "approve") {
      toast.error("Final approval blocked", {
        description: "All 3 pillars (documents, face, mobile) must be approved first.",
      });
      return;
    }
    await k.updatePillar(sub.user_id, activePillar, action, notes.trim() || undefined);
    setNotes("");
  };

  const phone = sub.phone_computed || dataJson.phone || sub.mobile_number;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{sub.email_computed || sub.user_id}</p>
        </div>
        <FinalStatusPill status={sub.final_status as any} />
      </div>

      {/* Pillar tab strip — sticky, always visible */}
      <div className="grid grid-cols-4 gap-1.5 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur shrink-0">
        {(
          [
            { key: "documents", label: "Docs", icon: FileText, status: sub.documents_status },
            { key: "face", label: "Face", icon: Camera, status: sub.face_status },
            { key: "mobile", label: "Mobile", icon: Phone, status: sub.mobile_status },
            { key: "final", label: "Final", icon: ShieldCheck, status: (allGreen ? "approved" : sub.final_status === "approved" ? "approved" : sub.final_status === "rejected" ? "rejected" : "pending_review") as PillarStatus },
          ] as { key: Pillar; label: string; icon: any; status: PillarStatus }[]
        ).map((p) => {
          const active = activePillar === p.key;
          const Icon = p.icon;
          return (
            <button
              key={p.key}
              onClick={() => setActivePillar(p.key)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all",
                active ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border/60 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-3.5 w-3.5" />
                <span className={cn("h-2 w-2 rounded-full", statusDot(p.status))} />
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-none">{p.label}</p>
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40 space-y-3">
        {/* Profile */}
        <SectionCard icon={User2} title="Profile">
          <Field label="Full name" value={name} />
          <Field label="Email" value={sub.email_computed || sub.profile_email} />
          <Field label="Username" value={sub.username} />
          <Field label="User ID" value={sub.user_id} mono />
          <Field label="Date of birth" value={dataJson.date_of_birth} />
          <Field
            label="Address"
            value={[
              dataJson.address_line1,
              dataJson.address_line2,
              dataJson.city,
              dataJson.state,
              dataJson.postal_code,
              dataJson.country,
            ].filter(Boolean).join(", ")}
          />
          <Field label="Nationality" value={dataJson.nationality} />
        </SectionCard>

        {/* Documents */}
        <SectionCard
          icon={FileText}
          title="Documents"
          status={sub.documents_status}
          highlighted={activePillar === "documents"}
          onSelect={() => setActivePillar("documents")}
        >
          <Field label="ID type" value={dataJson.id_type} />
          <Field label="ID number" value={dataJson.id_number} mono />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <KycImageViewer
              url={assets.idFrontUrl}
              label="Front"
              tone="primary"
              aspect="card"
              loading={assetsLoading}
            />
            <KycImageViewer
              url={assets.idBackUrl}
              label="Back"
              tone="violet"
              aspect="card"
              loading={assetsLoading}
            />
            {assets.addressProofUrl && (
              <KycImageViewer
                url={assets.addressProofUrl}
                label="Address proof"
                tone="amber"
                aspect="card"
                loading={assetsLoading}
                className="col-span-2"
              />
            )}
          </div>

          {sub.documents_notes && <NoteBlock label="Last admin note" text={sub.documents_notes} />}
        </SectionCard>

        {/* Face */}
        <SectionCard
          icon={Camera}
          title="Face verification"
          status={sub.face_status}
          highlighted={activePillar === "face"}
          onSelect={() => setActivePillar("face")}
        >
          <div className="grid grid-cols-2 gap-2">
            <KycImageViewer
              url={assets.selfieUrl}
              label="Selfie"
              tone="sky"
              aspect="square"
              loading={assetsLoading}
            />
            <KycImageViewer
              url={assets.idFrontUrl}
              label="ID photo"
              tone="primary"
              aspect="square"
              loading={assetsLoading}
            />
          </div>
          <p className="mt-2 rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
            Compare the selfie against the photo on the ID. Reject if it appears to be a printed
            photo, a deepfake, or doesn't match.
          </p>
          <Field
            label="Captured"
            value={sub.face_captured_at ? format(new Date(sub.face_captured_at), "PPpp") : null}
          />
          {sub.face_notes && <NoteBlock label="Last admin note" text={sub.face_notes} />}
        </SectionCard>

        {/* Mobile */}
        <SectionCard
          icon={Phone}
          title="Mobile (manual)"
          status={sub.mobile_status}
          highlighted={activePillar === "mobile"}
          onSelect={() => setActivePillar("mobile")}
        >
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Number to verify</p>
            <p className="mt-0.5 select-all font-mono text-base font-semibold">{phone || "—"}</p>
          </div>
          <Field
            label="Submitted"
            value={sub.mobile_submitted_at ? format(new Date(sub.mobile_submitted_at), "PPpp") : null}
          />
          <Field
            label="Verified"
            value={sub.mobile_verified_at ? format(new Date(sub.mobile_verified_at), "PPpp") : null}
          />
          {sub.mobile_notes && <NoteBlock label="Last admin note" text={sub.mobile_notes} />}
          <p className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-700 dark:text-amber-400">
            ⚠️ Call or SMS this number out-of-band before approving. Reject if the number is
            invalid or unreachable.
          </p>
        </SectionCard>

        {/* Final */}
        <SectionCard
          icon={ShieldCheck}
          title="Final approval"
          highlighted={activePillar === "final"}
          onSelect={() => setActivePillar("final")}
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Documents", status: sub.documents_status },
              { label: "Face", status: sub.face_status },
              { label: "Mobile", status: sub.mobile_status },
            ].map((p) => (
              <div key={p.label} className={cn(
                "rounded-lg border p-2.5 text-center",
                p.status === "approved"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-border bg-muted/30"
              )}>
                <span className={cn(
                  "mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full",
                  p.status === "approved" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {p.status === "approved" ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3 w-3" />}
                </span>
                <p className="text-[11px] font-semibold">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{statusLabel(p.status)}</p>
              </div>
            ))}
          </div>

          <p className={cn(
            "mt-3 rounded-lg p-2.5 text-xs",
            allGreen ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}>
            {allGreen
              ? "✅ All 3 pillars are approved — you can grant final approval. The user will be unlocked instantly."
              : "⏳ Approve all 3 pillars first. Final approval is blocked until docs, face and mobile are all green."}
          </p>

          {sub.rejection_reason && <NoteBlock label="Rejection reason" text={sub.rejection_reason} />}
        </SectionCard>

        {/* Audit */}
        <SectionCard icon={History} title={`Audit history (${audit.length})`}>
          {audit.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history yet.</p>
          ) : (
            <ol className="space-y-2.5 border-l border-border/60 pl-3">
              {audit.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-xs">
                    <span className="font-semibold capitalize">{a.pillar}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="capitalize">{a.action.replace(/_/g, " ")}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {a.status_before} → {a.status_after}
                    </span>
                  </p>
                  {a.notes && <p className="mt-0.5 text-xs text-muted-foreground">"{a.notes}"</p>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{format(new Date(a.created_at), "PPpp")}</p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* Sticky decision bar */}
      <div
        className="sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 px-3 py-3 backdrop-blur shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action on</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold capitalize text-primary">
            {activePillar}
          </span>
          {finalBlocked && (
            <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              All 3 pillars required
            </span>
          )}
        </div>
        <Textarea
          placeholder={
            activePillar === "final"
              ? "Optional note (recommended for record)…"
              : "Reason — required for Reject / Resubmit"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm resize-none mb-2"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            size="sm"
            onClick={() => act("approve")}
            disabled={k.busy || finalBlocked}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-11"
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => act("request_resubmission")}
            disabled={k.busy}
            className="h-11 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          >
            <AlertCircle className="mr-1 h-3.5 w-3.5" /> Resubmit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => act("reject")} disabled={k.busy} className="h-11">
            <X className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
        </div>
        {activePillar === "final" && (sub.final_status === "approved" || sub.final_status === "suspended") && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full h-10"
            onClick={() => act(sub.final_status === "approved" ? "suspend" : "unsuspend")}
            disabled={k.busy}
          >
            {sub.final_status === "approved" ? "Suspend account" : "Unsuspend account"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- helpers ---------------------------------- */

function SectionCard({
  icon: Icon,
  title,
  status,
  highlighted,
  onSelect,
  children,
}: {
  icon: any;
  title: string;
  status?: PillarStatus;
  highlighted?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-3.5 transition-all",
        highlighted ? "border-primary/40 ring-1 ring-primary/30 shadow-sm" : "border-border/60",
        onSelect && "cursor-pointer hover:border-primary/30"
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {status && <PillarBadge s={status} />}
      </div>
      <div className="space-y-1">{children}</div>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-xs text-right break-all", mono && "font-mono text-[11px]")}>{value}</span>
    </div>
  );
}

function NoteBlock({ label, text }: { label?: string; text: string }) {
  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
      {label && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>}
      <p className="break-words">{text}</p>
    </div>
  );
}
