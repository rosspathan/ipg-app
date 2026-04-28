/**
 * KycDiagnosticsPanel — instant "can this user trade/withdraw/etc.?" verdict
 * for admin reviewers. Reads from public.admin_kyc_access_check (single RPC
 * round-trip) and renders a compact, mobile-friendly grid.
 *
 * All verdicts share the same authoritative gate today (is_kyc_approved),
 * but the per-action rows make admin troubleshooting unambiguous.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAdminKycDiagnostics,
  KYC_ACTION_LABELS,
} from "@/hooks/useAdminKycDiagnostics";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  className?: string;
}

const PILLAR_ROWS: Array<{ key: "documents" | "face" | "mobile" | "final"; label: string }> = [
  { key: "documents", label: "Documents" },
  { key: "face", label: "Face" },
  { key: "mobile", label: "Mobile (admin)" },
  { key: "final", label: "Final approval" },
];

function statusTone(s: string) {
  if (s === "approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (s === "rejected" || s === "needs_resubmission") return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  if (s === "submitted" || s === "pending_review") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function KycDiagnosticsPanel({ userId, className }: Props) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminKycDiagnostics(userId);

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          KYC Access Check
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            Failed to load diagnostics: {(error as Error)?.message ?? "unknown error"}
          </div>
        )}

        {data && (
          <>
            {/* Headline verdict */}
            <div
              className={cn(
                "rounded-lg border px-3 py-2.5 flex items-center gap-2",
                data.is_kyc_approved
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              )}
            >
              {data.is_kyc_approved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {data.is_kyc_approved
                    ? "Fully approved — all features unlocked"
                    : "Blocked from sensitive actions"}
                </div>
                {data.block_reason && (
                  <div className="text-xs text-muted-foreground truncate">
                    {data.block_reason}
                  </div>
                )}
              </div>
            </div>

            {/* Pillars */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Pillars
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PILLAR_ROWS.map(({ key, label }) => {
                  const p = data.pillars[key];
                  return (
                    <div
                      key={key}
                      className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
                    >
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 text-[10px] font-medium", statusTone(p.status))}
                      >
                        {p.status}
                      </Badge>
                      {p.notes && (
                        <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                          {p.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Per-action verdict
              </div>
              <div className="rounded-md border border-border/60 divide-y divide-border/60 overflow-hidden">
                {KYC_ACTION_LABELS.map(({ key, label }) => {
                  const a = data.actions[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-2.5 py-2 text-xs"
                    >
                      <span className="text-foreground/90 truncate pr-2">{label}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {a.allowed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Allowed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            <span className="text-rose-300 font-medium">Blocked</span>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground text-right">
              Checked {new Date(data.checked_at).toLocaleTimeString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
