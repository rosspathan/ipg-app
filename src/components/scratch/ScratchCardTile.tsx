import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScratchSurface } from "./ScratchSurface";
import { CountUp } from "./CountUp";
import type { ScratchCard, ScratchPayout, ScratchBatch } from "@/hooks/useScratchCards";

const BSCSCAN_TX = "https://bscscan.com/tx/";

export interface ScratchCardTileProps {
  card: ScratchCard;
  payout?: ScratchPayout;
  batch?: ScratchBatch;
  /** campaign enabled (config.is_enabled) */
  campaignEnabled: boolean;
  /** whether KYC is required by config */
  requireKyc: boolean;
  /** whether the current user is KYC-approved */
  kycApproved: boolean;
  busy?: boolean;
  onReveal: (cardId: string) => void;
  onClaim: (cardId: string) => void;
  onCompleteKyc?: () => void;
  /** show a sparkle burst right after a reveal */
  celebrate?: boolean;
  className?: string;
}

function sourceLabel(card: ScratchCard) {
  if (card.source === "referral_signup") return "Referral reward";
  if (card.source === "referral_welcome") return "Welcome reward";
  return "Reward";
}

export function ScratchCardTile({
  card,
  payout,
  batch,
  campaignEnabled,
  requireKyc,
  kycApproved,
  busy,
  onReveal,
  onClaim,
  onCompleteKyc,
  celebrate,
  className,
}: ScratchCardTileProps) {
  const [burst, setBurst] = useState(false);

  const locked = requireKyc && !kycApproved;
  const isUnscratched = card.status === "unscratched";
  const isRevealed = card.status !== "unscratched" && card.status !== "voided";

  const handleScratchComplete = () => {
    if (busy) return;
    if (celebrate) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 1400);
    }
    onReveal(card.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-[1.5px]",
        className,
      )}
      style={{
        background:
          "linear-gradient(140deg, hsl(45 90% 60% / 0.55), hsl(186 100% 50% / 0.25), hsl(45 90% 60% / 0.15))",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[22px] p-5"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, hsl(223 32% 13%) 0%, hsl(222 39% 8%) 70%)",
        }}
      >
        {/* foil glow accent */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(45 95% 60% / 0.6), transparent 70%)" }}
        />

        {/* Header */}
        <div className="relative z-10 mb-4 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: "hsl(45 90% 70%)",
              background: "hsl(45 90% 55% / 0.12)",
              border: "1px solid hsl(45 90% 55% / 0.3)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {sourceLabel(card)}
          </span>
          {locked && isUnscratched && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              <Lock className="h-3 w-3" /> KYC
            </span>
          )}
        </div>

        {/* Reward surface */}
        <div className="relative z-10">
          {isUnscratched ? (
            locked ? (
              <LockedSurface onCompleteKyc={onCompleteKyc} />
            ) : (
              <ScratchSurface
                onComplete={handleScratchComplete}
                disabled={busy || !campaignEnabled}
                foilLabel={campaignEnabled ? "Scratch here" : "Paused"}
                className="h-32 w-full overflow-hidden rounded-2xl"
              >
                <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5">
                  {busy ? (
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  ) : (
                    <>
                      <Sparkles className="h-7 w-7 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        Your reward is hidden
                      </span>
                    </>
                  )}
                </div>
              </ScratchSurface>
            )
          ) : (
            <RevealedAmount amount={card.reward_amount_bsk} burst={burst} dimmed={card.status === "voided"} />
          )}
        </div>

        {/* Actions / status */}
        <div className="relative z-10 mt-4 min-h-[44px]">
          {card.status === "claimable" && (
            <Button
              className="w-full font-semibold"
              disabled={busy || !campaignEnabled}
              onClick={() => onClaim(card.id)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Claim to On-chain Wallet
            </Button>
          )}

          {card.status === "treasury_pending" && (
            <p className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Reward reserved — claimable once the reward pool is funded.
            </p>
          )}

          {card.status === "claiming" && (
            <div className="space-y-1.5">
              {batch?.tx_hash ? (
                <TxLink hash={batch.tx_hash} broadcasting />
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Broadcasting your reward on-chain…
                </p>
              )}
            </div>
          )}

          {card.status === "claimed" && (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Paid out
              </span>
              {batch?.tx_hash && <TxLink hash={batch.tx_hash} />}
            </div>
          )}

          {card.status === "voided" && (
            <p className="text-xs text-muted-foreground">This card is no longer available.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LockedSurface({ onCompleteKyc }: { onCompleteKyc?: () => void }) {
  return (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 text-center">
      <Lock className="h-7 w-7 text-amber-400" />
      <p className="text-[11px] font-medium leading-snug text-amber-300/90">
        Complete and get KYC approved to unlock your Scratch Card reward.
      </p>
      {onCompleteKyc && (
        <button
          onClick={onCompleteKyc}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-500/30"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Complete KYC
        </button>
      )}
    </div>
  );
}

function RevealedAmount({
  amount,
  burst,
  dimmed,
}: {
  amount: number | null;
  burst?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-32 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl",
        dimmed ? "opacity-60" : "",
      )}
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, hsl(45 90% 55% / 0.16), hsl(223 32% 11%) 70%)",
        border: "1px solid hsl(45 90% 55% / 0.25)",
      }}
    >
      <AnimatePresence>
        {burst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 2.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, hsl(45 95% 65% / 0.5), transparent 60%)",
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="flex items-baseline gap-1"
      >
        <span
          className="font-heading text-4xl font-extrabold tabular-nums"
          style={{
            background: "linear-gradient(135deg, #fde68a, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          <CountUp value={amount ?? 0} decimals={amount && amount % 1 !== 0 ? 2 : 0} />
        </span>
        <span className="text-sm font-bold text-amber-300/80">BSK</span>
      </motion.div>
      <span className="text-[11px] font-medium text-muted-foreground">You won</span>
    </div>
  );
}

function TxLink({ hash, broadcasting }: { hash: string; broadcasting?: boolean }) {
  return (
    <a
      href={`${BSCSCAN_TX}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
    >
      {broadcasting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ExternalLink className="h-3 w-3" />
      )}
      {broadcasting ? "Broadcasting — view tx" : "View on BscScan"}
    </a>
  );
}
