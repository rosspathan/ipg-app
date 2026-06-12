import { useNavigate } from "react-router-dom";
import { Gift, Sparkles, ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import { useScratchCards } from "@/hooks/useScratchCards";
import { useKYCStatus } from "@/hooks/useKYCStatus";
import { cn } from "@/lib/utils";

/** Compact "Scratch & Win" discovery card for the home dashboard. */
export function ScratchSummaryCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { summary, config, loading } = useScratchCards();
  const { data: kyc } = useKYCStatus();

  if (loading || summary.total === 0) return null;

  const locked = !!config?.require_kyc && !kyc?.isApproved;

  const stats = [
    { label: "Available", value: summary.scratchable, show: summary.scratchable > 0 },
    { label: "Claimable", value: summary.claimable, show: summary.claimable > 0 },
    { label: "Claimed", value: summary.claimed, show: summary.claimed > 0 },
  ].filter((s) => s.show);

  return (
    <button
      onClick={() => navigate("/app/scratch-cards")}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl p-[1.5px] text-left transition-transform active:scale-[0.99]",
        className,
      )}
      style={{
        background:
          "linear-gradient(140deg, hsl(45 90% 60% / 0.55), hsl(186 100% 50% / 0.25), hsl(45 90% 60% / 0.15))",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[22px] p-4"
        style={{ background: "radial-gradient(120% 120% at 0% 0%, hsl(223 32% 13%), hsl(222 39% 8%) 70%)" }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40 blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(45 95% 60% / 0.6), transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 55% / 0.25), hsl(186 100% 50% / 0.12))",
              border: "1px solid hsl(45 90% 55% / 0.35)",
            }}
          >
            <Gift className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">Scratch &amp; Win</p>
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {locked
                ? "Approve KYC to unlock your rewards"
                : summary.scratchable > 0
                  ? `${summary.scratchable} card${summary.scratchable > 1 ? "s" : ""} ready to scratch`
                  : summary.claimable > 0
                    ? `${summary.claimable} reward${summary.claimable > 1 ? "s" : ""} ready to claim`
                    : "View your reward history"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {(stats.length > 0 || locked) && (
          <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-400">
                <Lock className="h-3 w-3" /> KYC required
              </span>
            )}
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
              >
                {s.label === "Claimed" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                <span className="font-bold text-foreground">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
