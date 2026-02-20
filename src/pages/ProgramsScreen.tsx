import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Gift,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ProgramTileUltra, type TileBadgeType } from "@/components/programs-pro/ProgramTileUltra";
import { useActivePrograms, getLucideIcon } from "@/hooks/useActivePrograms";
import { useFilteredPrograms } from "@/hooks/useFilteredPrograms";
import { ProgramLockBadge } from "@/components/programs/ProgramLockBadge";
import { ProgramUnlockDialog } from "@/components/programs/ProgramUnlockDialog";
import { LoansProgramTile } from "@/components/loans/LoansProgramTile";
import { cn } from "@/lib/utils";

// ─── Archive Section ──────────────────────────────────────────────────────────
function ArchiveSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl",
          "text-sm font-semibold text-muted-foreground",
          "hover:bg-muted/40 transition-colors duration-200"
        )}
      >
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
        Archived Programs
        <span className="ml-auto text-xs font-normal opacity-60">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── 2-column program grid tile ──────────────────────────────────────────────
interface GridTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: TileBadgeType;
  isLocked?: boolean;
  lockReason?: string;
  href: string;
  onLockedClick?: () => void;
}

const badgePill: Record<TileBadgeType, string> = {
  NEW: "bg-accent/20 text-accent border-accent/30",
  HOT: "bg-danger/20 text-danger border-danger/30",
  DAILY: "bg-success/20 text-success border-success/30",
  LIVE: "bg-primary/20 text-primary border-primary/30",
};

function ProgramGridTile({
  icon,
  title,
  subtitle,
  badge,
  isLocked,
  lockReason,
  href,
  onLockedClick,
}: GridTileProps) {
  const [isPressed, setIsPressed] = useState(false);

  const inner = (
    <div
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-2xl",
        "border transition-all duration-200 group",
        // Light mode
        "bg-white/80 border-border/30 shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5",
        // Dark mode
        "dark:bg-card/60 dark:border-white/8 dark:shadow-none",
        "dark:hover:border-primary/30 dark:hover:shadow-[0_4px_24px_rgba(124,77,255,0.15)]",
        isPressed && "scale-[0.98]",
        isLocked && "opacity-60"
      )}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
    >
      {/* Icon container */}
      <div
        className={cn(
          "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
          // Light mode: soft coloured background
          "bg-primary/8 text-primary",
          "group-hover:bg-primary/15",
          // Dark mode: neon glow tint
          "dark:bg-primary/15 dark:text-primary",
          "dark:group-hover:bg-primary/25 dark:group-hover:shadow-[0_0_16px_rgba(124,77,255,0.4)]",
          "transition-all duration-200"
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground leading-tight truncate">
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
          {subtitle}
        </p>
      </div>

      {/* Badge + chevron */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {badge && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
              badgePill[badge]
            )}
          >
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-medium px-3 text-center">
            {lockReason}
          </p>
        </div>
      )}
    </div>
  );

  if (isLocked) {
    return (
      <button className="text-left w-full" onClick={onLockedClick}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={href} className="block">
      {inner}
    </Link>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
const ProgramsScreen = () => {
  const { programs: rawPrograms, isLoading, isUsingDefaults } = useActivePrograms();
  const { programs } = useFilteredPrograms(rawPrograms);
  const [unlockDialog, setUnlockDialog] = useState<{
    open: boolean;
    programName: string;
    lockReasons: string[];
  }>({ open: false, programName: "", lockReasons: [] });

  const activePrograms = programs;
  // Archive section is available for future use when programs support archived status

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="mr-2">
              <Link to="/app/home">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Programs</h1>
              <p className="text-xs text-muted-foreground">Explore all programs</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading programs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── BACKGROUND SYSTEM ─────────────────────────────────────────────── */}
      {/* Light mode: soft layered gradient */}
      <div
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          background:
            "linear-gradient(160deg, hsl(220 40% 97%) 0%, hsl(230 50% 94%) 50%, hsl(240 35% 96%) 100%)",
        }}
      />
      {/* Light mode top-left radial glow */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none dark:hidden"
        style={{
          background:
            "radial-gradient(circle, hsl(220 80% 85% / 0.35) 0%, transparent 70%)",
        }}
      />
      {/* Light mode bottom-right accent */}
      <div
        className="absolute bottom-0 right-0 w-60 h-60 rounded-full pointer-events-none dark:hidden"
        style={{
          background:
            "radial-gradient(circle, hsl(240 70% 88% / 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Dark mode: deep navy base + teal glow */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background:
            "linear-gradient(160deg, hsl(225 35% 8%) 0%, hsl(230 40% 5%) 60%, hsl(220 35% 7%) 100%)",
        }}
      />
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none hidden dark:block"
        style={{
          background:
            "radial-gradient(circle, hsl(180 80% 40% / 0.1) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 right-0 w-64 h-64 rounded-full pointer-events-none hidden dark:block"
        style={{
          background:
            "radial-gradient(circle, hsl(260 80% 60% / 0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "sticky top-0 z-20 backdrop-blur-xl border-b",
          "bg-white/70 border-border/20 dark:bg-background/60 dark:border-white/6"
        )}
      >
        <div className="flex items-center px-4 py-4">
          <Button variant="ghost" size="icon" asChild className="mr-3 shrink-0">
            <Link to="/app/home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Programs
              </h1>
              {/* Gradient underline accent */}
              <Sparkles className="w-4 h-4 text-primary opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore all programs
            </p>
            {/* Thin gradient underline under title */}
            <div
              className="mt-1.5 h-[2px] w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 px-4 pt-4 pb-8 space-y-5">
        {/* ── ANNOUNCEMENT BANNER ─────────────────────────────────────────── */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-4",
            // Light mode: primary/5 gives a very soft blue tint
            "bg-primary/5 border-primary/20 shadow-sm",
            // Dark mode: richer gradient
            "dark:bg-gradient-to-r dark:from-primary/20 dark:via-accent/15 dark:to-primary/10",
            "dark:border-primary/30 dark:shadow-[0_4px_32px_rgba(0,229,255,0.1)]",
            "dark:backdrop-blur-sm"
          )}
        >
          {/* Decorative background blob – dark only */}
          <div
            className="absolute right-0 top-0 w-24 h-24 rounded-full pointer-events-none hidden dark:block"
            style={{
              background:
                "radial-gradient(circle, hsl(180 80% 40% / 0.2) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
                  "bg-primary/10 dark:bg-primary/20"
                )}
              >
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  BSK Purchase Bonus
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get 50% extra on every purchase!
                </p>
              </div>
            </div>
            <Link
              to="/app/programs/bsk-bonus"
              className={cn(
                "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 active:scale-[0.97] transition-all duration-150",
                "dark:shadow-[0_0_12px_rgba(124,77,255,0.4)]"
              )}
            >
              Explore
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── DEFAULT NOTICE ─────────────────────────────────────────────── */}
        {isUsingDefaults && (
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Using default programs. Configure in admin panel for custom
              programs.
            </p>
          </div>
        )}

        {/* ── LOANS FEATURED TILE ────────────────────────────────────────── */}
        {/* Full-width at the top as a "featured" card */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            Featured
          </p>
          <LoansProgramTile />
        </div>

        {/* ── PROGRAMS 2-COLUMN GRID ─────────────────────────────────────── */}
        {activePrograms.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-0.5">
              All Programs
            </p>
            <div className="grid grid-cols-1 gap-3">
              {/* Pair programs into 2-col rows */}
              {activePrograms.map((program) => {
                const IconComponent = getLucideIcon(program.icon || "Box");

                const handleLockedClick = () => {
                  setUnlockDialog({
                    open: true,
                    programName: program.name,
                    lockReasons: program.lockReasons,
                  });
                };

                return (
                  <ProgramGridTile
                    key={program.id}
                    icon={<IconComponent className="w-5 h-5" />}
                    title={program.name}
                    subtitle={program.description || ""}
                    badge={program.badge as TileBadgeType}
                    isLocked={program.isLocked}
                    lockReason={program.lockReasons?.[0]}
                    href={program.route || `/programs/${program.key}`}
                    onLockedClick={handleLockedClick}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── ARCHIVE SECTION (placeholder for future archived programs) ── */}
        {false && (
          <ArchiveSection>
            <div className="grid grid-cols-1 gap-2 mt-1">
              {activePrograms.map((program) => {
                const IconComponent = getLucideIcon(program.icon || "Box");
                return (
                  <div
                    key={program.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl",
                      "border border-border/30 opacity-60",
                      "bg-muted/30 dark:bg-card/20"
                    )}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground truncate">
                        {program.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Archived
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ArchiveSection>
        )}
      </div>

      <ProgramUnlockDialog
        open={unlockDialog.open}
        onOpenChange={(open) => setUnlockDialog({ ...unlockDialog, open })}
        programName={unlockDialog.programName}
        lockReasons={unlockDialog.lockReasons}
      />
    </div>
  );
};

export default ProgramsScreen;
