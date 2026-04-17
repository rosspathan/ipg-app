import { ShieldAlert, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKycGate } from "@/hooks/useKycGate";
import { cn } from "@/lib/utils";

interface Props {
  /** Verb used in headline: "trade", "withdraw", "migrate funds". */
  action?: string;
  className?: string;
  /** Render compact inline strip instead of full card. */
  compact?: boolean;
}

/**
 * Locked-state banner shown above any feature that requires approved KYC.
 * Auto-hides when the user is approved.
 */
export function KycLockedBanner({ action = "use this feature", className, compact }: Props) {
  const navigate = useNavigate();
  const gate = useKycGate();

  if (gate.loading) {
    return compact ? null : (
      <div className={cn("flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" /> Checking KYC status…
      </div>
    );
  }
  if (gate.approved) return null;

  const dotClass = (s: string) =>
    s === "approved"
      ? "bg-emerald-500"
      : s === "rejected" || s === "needs_resubmission"
        ? "bg-rose-500"
        : s === "pending_review"
          ? "bg-amber-500"
          : "bg-muted-foreground/40";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate("/app/profile/kyc")}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-left text-sm hover:bg-amber-500/10 transition-colors",
          className
        )}
      >
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">New KYC required to {action}</div>
          <div className="truncate text-xs text-muted-foreground">Legacy KYC is no longer sufficient · {gate.reason}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="rounded-xl bg-amber-500/15 p-2.5 shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight">
            New KYC required to {action}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete all 3 pillars (documents, face, mobile) plus admin approval.
            {' '}Previous/legacy KYC is no longer sufficient.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">{gate.reason}</p>

          {/* Pillar status chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { key: "documents", label: "Documents", status: gate.documentsStatus },
              { key: "face", label: "Face", status: gate.faceStatus },
              { key: "mobile", label: "Mobile", status: gate.mobileStatus },
            ].map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", dotClass(p.status))} />
                <span className="font-medium">{p.label}</span>
                <span className="text-muted-foreground capitalize">
                  {p.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate("/app/profile/kyc")}>
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              {gate.finalStatus === "rejected" || gate.finalStatus === "needs_resubmission"
                ? "Resubmit KYC"
                : gate.documentsStatus === "not_submitted"
                  ? "Start KYC"
                  : "Continue KYC"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
