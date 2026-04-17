/**
 * Admin KYC Review Console v2 — world-class mobile-first 3-pillar review.
 *
 * Layout:
 *   - Sticky header with title + refresh
 *   - Compact stat cards (mobile: 2-col grid, desktop: 4-col)
 *   - Filter chip-row + search
 *   - User cards (mobile-first, no horizontal-scroll tables)
 *   - Tap user → full-screen Sheet with sectioned accordion (Overview / Documents / Face / Mobile / Audit)
 *   - Floating expandable action button (Approve / Reject / Resubmit) per pillar
 */
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ShieldCheck, Search, RefreshCw, FileText, Camera, Phone, X, Check,
  Clock, AlertCircle, ChevronDown, History, User2, Loader2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAdminKYCv2, type KycSubmissionV2, type KycQueueFilter, type KycAuditEntry, type PillarStatus } from "@/hooks/useAdminKYCv2";
import { cn } from "@/lib/utils";

const filterChips: { value: KycQueueFilter; label: string; statKey: "pendingAny" | "pendingDocs" | "pendingFace" | "pendingMobile" | "readyFinal" | "approved" | "rejected" | "suspended" | "total" }[] = [
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

const PillarBadge = ({ s, label }: { s: PillarStatus; label: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
    <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(s))} />
    {label}
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

      {/* Stats — 2-col mobile, 4-col tablet+ */}
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
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
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
            <PillarBadge s={sub.documents_status} label="Docs" />
            <PillarBadge s={sub.face_status} label="Face" />
            <PillarBadge s={sub.mobile_status} label="Mobile" />
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

function ReviewDrawer({ sub, k, onClose }: { sub: KycSubmissionV2; k: ReturnType<typeof useAdminKYCv2>; onClose: () => void }) {
  const name = sub.full_name_computed || sub.display_name || sub.username || "Unknown";
  const dataJson = sub.data_json || {};
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [audit, setAudit] = useState<KycAuditEntry[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [activePillar, setActivePillar] = useState<"documents" | "face" | "mobile" | "final">("documents");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await k.getSelfieUrl(sub.face_selfie_path);
      if (!cancelled) setSelfieUrl(url);
      const a = await k.fetchAudit(sub.user_id);
      if (!cancelled) setAudit(a);
    })();
    return () => { cancelled = true; };
  }, [sub.id, sub.face_selfie_path, sub.user_id, k]);

  const allGreen = sub.documents_status === "approved" && sub.face_status === "approved" && sub.mobile_status === "approved";

  const act = async (action: "approve" | "reject" | "request_resubmission" | "suspend" | "unsuspend") => {
    if (action !== "approve" && !notes.trim()) {
      alert("Please add a note explaining the decision.");
      return;
    }
    await k.updatePillar(sub.user_id, activePillar, action, notes.trim() || undefined);
    setNotes("");
    setFabOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{sub.email_computed || sub.user_id}</p>
        </div>
        <FinalStatusPill status={sub.final_status as any} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
        {/* Sticky pillar status row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "documents" as const, label: "Documents", icon: FileText, status: sub.documents_status },
            { key: "face" as const, label: "Face", icon: Camera, status: sub.face_status },
            { key: "mobile" as const, label: "Mobile", icon: Phone, status: sub.mobile_status },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePillar(p.key)}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all",
                activePillar === p.key ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <p.icon className="h-4 w-4" />
                <span className={cn("h-2 w-2 rounded-full", statusDot(p.status))} />
              </div>
              <p className="mt-1 text-xs font-semibold">{p.label}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{p.status.replace(/_/g, " ")}</p>
            </button>
          ))}
        </div>

        <Accordion type="multiple" defaultValue={["overview", activePillar]} className="space-y-2">
          {/* Overview */}
          <AccordionItem value="overview" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2"><User2 className="h-4 w-4" /> Profile</div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <Field label="Full name" value={name} />
              <Field label="Email" value={sub.email_computed || sub.profile_email} />
              <Field label="Username" value={sub.username} />
              <Field label="User ID" value={sub.user_id} mono />
              <Field label="DOB" value={dataJson.date_of_birth} />
              <Field label="Address" value={[dataJson.address_line1, dataJson.city, dataJson.postal_code].filter(Boolean).join(", ")} />
            </AccordionContent>
          </AccordionItem>

          {/* Documents */}
          <AccordionItem value="documents" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</div>
                <PillarBadge s={sub.documents_status} label="" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <Field label="ID type" value={dataJson.id_type} />
              <Field label="ID number" value={dataJson.id_number} mono />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {dataJson.id_front_url && <DocPreview path={dataJson.id_front_url} label="Front" k={k} />}
                {dataJson.id_back_url && <DocPreview path={dataJson.id_back_url} label="Back" k={k} />}
              </div>
              {sub.documents_notes && <NoteBlock text={sub.documents_notes} />}
            </AccordionContent>
          </AccordionItem>

          {/* Face */}
          <AccordionItem value="face" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Camera className="h-4 w-4" /> Face verification</div>
                <PillarBadge s={sub.face_status} label="" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              {selfieUrl ? (
                <img src={selfieUrl} alt="Selfie" className="aspect-square w-full max-w-xs mx-auto rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  {sub.face_selfie_path ? <Loader2 className="h-5 w-5 animate-spin" /> : "No selfie submitted yet"}
                </div>
              )}
              <Field label="Captured" value={sub.face_captured_at ? format(new Date(sub.face_captured_at), "PPpp") : null} />
              {sub.face_notes && <NoteBlock text={sub.face_notes} />}
            </AccordionContent>
          </AccordionItem>

          {/* Mobile */}
          <AccordionItem value="mobile" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> Mobile (manual)</div>
                <PillarBadge s={sub.mobile_status} label="" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <Field label="Number" value={sub.mobile_number} mono />
              <Field label="Submitted" value={sub.mobile_submitted_at ? format(new Date(sub.mobile_submitted_at), "PPpp") : null} />
              <Field label="Verified" value={sub.mobile_verified_at ? format(new Date(sub.mobile_verified_at), "PPpp") : null} />
              {sub.mobile_notes && <NoteBlock text={sub.mobile_notes} />}
              <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                ⚠️ Manually verify by calling/SMS this number out-of-band before approving.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Final */}
          <AccordionItem value="final" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Final approval</div>
                <FinalStatusPill status={sub.final_status as any} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <p className="text-sm">
                {allGreen
                  ? "✅ All 3 pillars are green — you can grant final approval."
                  : "⏳ All 3 pillars must be approved before final approval."}
              </p>
              {sub.rejection_reason && <NoteBlock text={`Rejection: ${sub.rejection_reason}`} />}
            </AccordionContent>
          </AccordionItem>

          {/* Audit */}
          <AccordionItem value="audit" className="rounded-xl border border-border/60 bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2"><History className="h-4 w-4" /> Audit ({audit.length})</div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
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
                      {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.created_at), "PPpp")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Floating expandable action button */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <Card className="w-[min(92vw,22rem)] space-y-2 p-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                Action: <span className="capitalize text-primary">{activePillar}</span>
              </p>
              <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => setFabOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Notes (required for reject/resubmit)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <Button size="sm" onClick={() => act("approve")} disabled={k.busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act("reject")} disabled={k.busy}>
                <X className="mr-1 h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => act("request_resubmission")} disabled={k.busy}>
                <AlertCircle className="mr-1 h-3.5 w-3.5" /> Resubmit
              </Button>
            </div>
            {activePillar === "final" && sub.final_status === "approved" && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => act("suspend")} disabled={k.busy}>
                Suspend account
              </Button>
            )}
            {activePillar === "final" && sub.final_status === "suspended" && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => act("unsuspend")} disabled={k.busy}>
                Unsuspend
              </Button>
            )}
          </Card>
        )}
        <Button
          size="lg"
          onClick={() => setFabOpen((o) => !o)}
          className={cn("h-14 w-14 rounded-full shadow-lg", fabOpen && "rotate-45")}
        >
          <Plus className="h-6 w-6 transition-transform" />
        </Button>
      </div>
    </div>
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

function NoteBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
      <span className="font-medium">Note: </span>{text}
    </div>
  );
}

function DocPreview({ path, label, k }: { path: string; label: string; k: ReturnType<typeof useAdminKYCv2> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      // path may be a full URL or storage path in 'kyc' bucket
      if (path.startsWith("http")) { setUrl(path); return; }
      const { data } = await import("@/integrations/supabase/client").then((m) => m.supabase.storage.from("kyc").createSignedUrl(path, 1800));
      setUrl(data?.signedUrl ?? null);
    })();
  }, [path]);
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-lg border border-border overflow-hidden">
      {url ? (
        <img src={url} alt={label} className="aspect-[3/2] w-full object-cover" />
      ) : (
        <div className="aspect-[3/2] w-full grid place-items-center bg-muted">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="px-2 py-1 text-[11px] font-medium bg-muted/30">{label}</div>
    </a>
  );
}
