/**
 * KycDecisionSheet — premium mobile-first bottom sheet for KYC decisions.
 *
 * One sheet, three intents:
 *   - approve:  optional note, single confirm button (green).
 *   - reject:   MANDATORY reason, destructive confirm (red). Final.
 *   - resubmit: MANDATORY reason (what to fix), warm confirm (amber).
 *
 * The reason field is large, focused-on-open, with inline character helper
 * and clear validation. No silent failures: confirm is disabled until the
 * required input is met. After success the sheet closes and the parent
 * receives an `onSuccess` callback so it can refresh + toast.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DecisionIntent = "approve" | "reject" | "resubmit";
export type DecisionPillar = "documents" | "face" | "mobile" | "final";

const INTENT_CONFIG: Record<
  DecisionIntent,
  {
    title: (p: DecisionPillar) => string;
    subtitle: string;
    icon: typeof Check;
    accent: string; // tailwind classes for accent ring/icon
    confirmLabel: string;
    confirmClass: string;
    reasonRequired: boolean;
    reasonLabel: string;
    reasonPlaceholder: string;
    helper: string;
  }
> = {
  approve: {
    title: (p) => (p === "final" ? "Grant final approval" : `Approve ${p}`),
    subtitle:
      "The user is notified instantly and the new status appears in their app.",
    icon: Check,
    accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    confirmLabel: "Confirm approval",
    confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    reasonRequired: false,
    reasonLabel: "Note (optional)",
    reasonPlaceholder: "Optional note for the audit log…",
    helper: "Recorded in audit history.",
  },
  reject: {
    title: (p) => (p === "final" ? "Final reject KYC" : `Reject ${p}`),
    subtitle:
      "This is a final rejection. The user will see the reason and cannot resubmit unless an admin reopens it.",
    icon: X,
    accent: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",
    confirmLabel: "Reject submission",
    confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
    reasonRequired: true,
    reasonLabel: "Reason for rejection (required)",
    reasonPlaceholder:
      "Explain clearly why the submission is being rejected. The user will see this message.",
    helper: "Be specific. The user receives this exact message.",
  },
  resubmit: {
    title: (p) => `Request resubmission · ${p}`,
    subtitle:
      "The user will be asked to fix the issue and submit again. They stay in their queue until resolved.",
    icon: AlertTriangle,
    accent: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    confirmLabel: "Request resubmission",
    confirmClass: "bg-amber-500 hover:bg-amber-600 text-white",
    reasonRequired: true,
    reasonLabel: "What should the user fix? (required)",
    reasonPlaceholder:
      "e.g. ID front photo is blurry — please upload a clearer image with all four corners visible.",
    helper: "Be actionable. Tell the user exactly what to upload or change.",
  },
};

interface Props {
  open: boolean;
  intent: DecisionIntent | null;
  pillar: DecisionPillar;
  userName: string;
  busy: boolean;
  /** Called with the trimmed reason (or empty string for optional notes). */
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

const MIN_REASON = 8;
const MAX_REASON = 500;

export function KycDecisionSheet({
  open,
  intent,
  pillar,
  userName,
  busy,
  onConfirm,
  onClose,
}: Props) {
  const cfg = intent ? INTENT_CONFIG[intent] : null;
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Reset whenever sheet opens with a new intent
  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
      // autofocus reason on next paint for instant typing
      const t = setTimeout(() => textRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open, intent, pillar]);

  if (!cfg || !intent) return null;

  const trimmed = reason.trim();
  const tooShort = cfg.reasonRequired && trimmed.length < MIN_REASON;
  const tooLong = trimmed.length > MAX_REASON;
  const invalid = tooShort || tooLong;
  const showError = touched && invalid;

  const handleConfirm = async () => {
    setTouched(true);
    if (invalid) {
      textRef.current?.focus();
      return;
    }
    await onConfirm(trimmed);
  };

  const Icon = cfg.icon;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <SheetContent
        side="bottom"
        className={cn(
          "p-0 rounded-t-3xl border-t-2 max-h-[92vh] overflow-hidden",
          "data-[state=open]:duration-300",
          intent === "reject" && "border-t-rose-500/40",
          intent === "resubmit" && "border-t-amber-500/40",
          intent === "approve" && "border-t-emerald-500/40"
        )}
        // Hide default close X — we render our own to control busy state.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col max-h-[92vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-4 shrink-0">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1",
                  cfg.accent
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight tracking-tight">
                  {cfg.title(pillar)}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  for <span className="font-medium text-foreground">{userName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              {cfg.subtitle}
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="kyc-decision-reason"
                  className="text-sm font-semibold"
                >
                  {cfg.reasonLabel}
                </Label>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    tooLong
                      ? "text-rose-600 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {trimmed.length}/{MAX_REASON}
                </span>
              </div>
              <Textarea
                ref={textRef}
                id="kyc-decision-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={cfg.reasonPlaceholder}
                rows={5}
                disabled={busy}
                className={cn(
                  "min-h-[120px] text-sm leading-relaxed resize-none",
                  showError &&
                    "border-rose-500/60 focus-visible:ring-rose-500/40"
                )}
                aria-invalid={showError}
                aria-describedby="kyc-decision-helper"
              />
              <div
                id="kyc-decision-helper"
                className={cn(
                  "flex items-start gap-1.5 text-[11px]",
                  showError ? "text-rose-600" : "text-muted-foreground"
                )}
              >
                {showError ? (
                  <>
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      {tooShort
                        ? `Please provide at least ${MIN_REASON} characters so the user understands.`
                        : `Reason is too long (max ${MAX_REASON}).`}
                    </span>
                  </>
                ) : (
                  <span>{cfg.helper}</span>
                )}
              </div>
            </div>

            {intent === "reject" && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="flex items-start gap-2 text-[12px] text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Final action.</strong> The user leaves the pending
                    queue and cannot retry without admin intervention.
                  </span>
                </p>
              </div>
            )}

            {intent === "approve" && pillar === "final" && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="flex items-start gap-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>All KYC-gated features unlock</strong> for this user
                    immediately after confirmation.
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Sticky action footer inside the sheet */}
          <div
            className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur shrink-0"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-sm font-semibold"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={busy || (touched && invalid)}
                className={cn("h-12 text-sm font-semibold", cfg.confirmClass)}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Icon className="mr-1.5 h-4 w-4" />
                    {cfg.confirmLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
