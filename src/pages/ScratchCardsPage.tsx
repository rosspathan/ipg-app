import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Loader2, ExternalLink, Sparkles, Lock, CheckCircle2, Clock } from "lucide-react";
import { useScratchCards, type ScratchCard } from "@/hooks/useScratchCards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BSCSCAN_TX = "https://bscscan.com/tx/";

function statusLabel(card: ScratchCard): { label: string; tone: "muted" | "accent" | "success" | "warn" } {
  switch (card.status) {
    case "unscratched":
      return { label: "Ready to scratch", tone: "accent" };
    case "claimable":
      return { label: "Won — claim now", tone: "success" };
    case "treasury_pending":
      return { label: "Pending funding", tone: "warn" };
    case "claiming":
      return { label: "Sending to wallet…", tone: "accent" };
    case "claimed":
      return { label: "Paid out", tone: "success" };
    case "voided":
      return { label: "Voided", tone: "muted" };
    default:
      return { label: card.status, tone: "muted" };
  }
}

export default function ScratchCardsPage() {
  const { cards, payouts, batches, config, loading, reveal, claim, reload } = useScratchCards();
  const [busy, setBusy] = useState<string | null>(null);

  const handleReveal = async (cardId: string) => {
    setBusy(cardId);
    try {
      const res = await reveal(cardId);
      if (res.status === "claimable") {
        toast.success(`You won ${res.reward_bsk} BSK! Claim it to your wallet.`);
      } else {
        toast.info(`Revealed ${res.reward_bsk} BSK — pending treasury funding.`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("KYC")) toast.error("KYC approval required before scratching.");
      else if (msg.includes("DISABLED")) toast.error("The scratch card campaign is not active.");
      else toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async (cardId: string) => {
    setBusy(cardId);
    try {
      const res = await claim(cardId);
      toast.success(res.tx_hash ? "Claim broadcast on-chain!" : "Claim submitted.");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("WALLET_ADDRESS")) toast.error("Set a valid wallet address in your profile first.");
      else if (msg.includes("KYC")) toast.error("KYC approval required before claiming.");
      else toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const toneClass: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    accent: "bg-primary/15 text-primary",
    success: "bg-emerald-500/15 text-emerald-500",
    warn: "bg-amber-500/15 text-amber-500",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Sparkles className="h-6 w-6 text-primary" />
          Scratch &amp; Win
        </h1>
        <p className="text-sm text-muted-foreground">
          Earn a scratch card every time someone you referred joins. Scratch to reveal{" "}
          {config ? `${config.min_reward_bsk}–${config.max_reward_bsk}` : "1–5"} BSK, then claim it
          straight to your on-chain wallet.
        </p>
      </header>

      {config && !config.is_enabled && (
        <Card className="flex items-center gap-3 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600">
          <Lock className="h-4 w-4 shrink-0" />
          The scratch card campaign is currently paused.
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Gift className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">No scratch cards yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Invite friends with your referral link. Each referral that signs up earns you a card.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const st = statusLabel(card);
            const payout = payouts[card.id];
            const batch = payout?.batch_id ? batches[payout.batch_id] : undefined;
            const isBusy = busy === card.id;
            return (
              <Card key={card.id} className="relative overflow-hidden p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {card.source === "referral_signup" ? "Referral reward" : "Reward"}
                  </Badge>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClass[st.tone]}`}>
                    {st.label}
                  </span>
                </div>

                {card.status === "unscratched" ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={isBusy || !config?.is_enabled}
                    onClick={() => handleReveal(card.id)}
                    className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground disabled:opacity-60"
                  >
                    {isBusy ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-6 w-6" />
                        <span className="text-sm font-semibold">Tap to scratch</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl bg-muted/50"
                  >
                    <span className="text-3xl font-bold text-foreground tabular-nums">
                      {card.reward_amount_bsk ?? "—"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">BSK</span>
                  </motion.div>
                )}

                <div className="mt-4 min-h-[40px]">
                  {card.status === "claimable" && (
                    <Button
                      className="w-full"
                      disabled={isBusy || !config?.is_enabled}
                      onClick={() => handleClaim(card.id)}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Claim to my wallet
                    </Button>
                  )}

                  {card.status === "treasury_pending" && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock className="h-3.5 w-3.5" />
                      Reward reserved — claimable once the reward pool is funded.
                    </p>
                  )}

                  {(card.status === "claiming" || (card.status === "claimed" && batch?.tx_hash)) && batch?.tx_hash && (
                    <a
                      href={`${BSCSCAN_TX}${batch.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {card.status === "claimed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      View transaction on BscScan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {card.status === "claiming" && !batch?.tx_hash && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Broadcasting your reward…
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
