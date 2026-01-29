import { useMemo, useState, useRef, useEffect } from "react";
import { Landmark, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useLoansOverview } from "@/hooks/useLoansOverview";

export function LoansProgramTile() {
  const { user } = useAuthUser();
  const [isPressed, setIsPressed] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();

  const { activeLoan, nextInstallment, isLoading } = useLoansOverview(user?.id);

  // Calculate progress
  const progressPct = useMemo(() => {
    const paid = activeLoan?.paid_bsk ?? 0;
    const total = (activeLoan as any)?.total_due_bsk ?? 0;
    if (!activeLoan || !total) return 0;
    return Math.max(0, Math.min(100, (paid / total) * 100));
  }, [activeLoan]);

  // Subline text
  const subtitle = useMemo(() => {
    if (isLoading) return "Loading...";
    if (!user?.id) return "0% interest loans";
    if (!activeLoan) return "0% interest loans";
    if (nextInstallment) {
      return `Next: ${(nextInstallment.total_due_bsk ?? 0).toFixed(0)} BSK`;
    }
    const outstanding = (activeLoan as any)?.outstanding_bsk;
    if (typeof outstanding === "number") return `${outstanding.toFixed(0)} BSK due`;
    return "Active loan";
  }, [activeLoan, nextInstallment, user?.id, isLoading]);

  // Breathing glow animation
  useEffect(() => {
    const glowInterval = setInterval(() => {
      setShowGlow((prev) => !prev);
    }, 6000);
    return () => clearInterval(glowInterval);
  }, []);

  const handlePointerDown = () => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      setIsPressed(false);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsPressed(false);
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsPressed(false);
  };

  // Status badge config
  const statusBadge = useMemo(() => {
    if (!activeLoan) return null;
    const status = activeLoan.status;
    if (status === "active") return { label: "ACTIVE", color: "bg-success/20 text-success border-success/30" };
    if (status === "overdue" || status === "in_arrears") return { label: "DUE", color: "bg-danger/20 text-danger border-danger/30" };
    if (status === "completed") return { label: "PAID", color: "bg-primary/20 text-primary border-primary/30" };
    return null;
  }, [activeLoan]);

  return (
    <Link
      to="/app/loans"
      className="col-span-1"
      data-testid="loans-program-tile"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden transition-all",
          "duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isPressed ? "scale-[1.03]" : "scale-100",
          "cursor-pointer"
        )}
      >
        {/* Card background with glow */}
        <div
          className={cn(
            "relative h-full min-h-[180px] p-4 rounded-2xl",
            "bg-gradient-to-br from-[#161A2C] to-[#1B2036]",
            "border border-[#2A2F42]/30",
            "transition-all duration-[320ms]",
            showGlow && !isPressed && "shadow-[0_0_24px_rgba(124,77,255,0.08)]"
          )}
          style={{
            boxShadow: isPressed ? "0 8px 32px rgba(124, 77, 255, 0.3)" : undefined,
          }}
        >
          {/* Top row: Badge */}
          <div className="flex items-start justify-between mb-3">
            {statusBadge ? (
              <div
                className={cn(
                  "px-2 py-0.5 rounded-full",
                  "text-[9px] font-[Inter] font-bold uppercase tracking-wider",
                  "border backdrop-blur-sm",
                  statusBadge.color
                )}
              >
                {statusBadge.label}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-primary/20 to-accent/20",
                "text-primary transition-all duration-[220ms]",
                "ring-2 ring-primary/20",
                isPressed && "scale-110 rotate-6 ring-primary/40"
              )}
              style={{
                boxShadow: isPressed
                  ? "0 0 20px rgba(124, 77, 255, 0.4)"
                  : "0 0 12px rgba(124, 77, 255, 0.2)",
              }}
            >
              <Landmark className="w-5 h-5" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="text-center mb-4">
            <h3 className="font-[Space_Grotesk] font-bold text-xs text-foreground mb-1 line-clamp-1">
              Loans
            </h3>
            <p className="font-[Inter] text-[10px] text-muted-foreground leading-tight line-clamp-2">
              {subtitle}
            </p>
          </div>

          {/* Footer: Progress bar if active loan */}
          <div className="mt-auto">
            {activeLoan && progressPct > 0 ? (
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-background/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-[320ms]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-[Inter] text-center">
                  {Math.round(progressPct)}% repaid
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground font-[Inter] text-center">
                Collateralize BSK
              </p>
            )}
          </div>

          {/* Rim-light sweep effect on press */}
          {isPressed && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, transparent 30%, rgba(124, 77, 255, 0.3) 50%, rgba(0, 229, 255, 0.3) 70%, transparent)",
                animation: "sweep 320ms ease-out",
              }}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
