import { useState } from "react";
import { Gift, Loader2, Sparkles, Lock, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScratchCards } from "@/hooks/useScratchCards";
import { useKYCStatus } from "@/hooks/useKYCStatus";
import { ScratchCardTile } from "@/components/scratch/ScratchCardTile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ScratchCardsPage() {
  const navigate = useNavigate();
  const { cards, payouts, batches, config, summary, loading, reveal, claim, reload } =
    useScratchCards();
  const { data: kyc } = useKYCStatus();
  const [busy, setBusy] = useState<string | null>(null);

  const locked = !!config?.require_kyc && !kyc?.isApproved;
  const range = config ? `${config.min_reward_bsk}–${config.max_reward_bsk}` : "1–5";

  const handleReveal = async (cardId: string) => {
    setBusy(cardId);
    try {
      const res = await reveal(cardId);
      if (res?.status === "claimable") toast.success(`You won ${res.reward_bsk} BSK!`);
      else toast.info(`Revealed ${res?.reward_bsk ?? ""} BSK — pending reward pool funding.`);
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("KYC")) toast.error("KYC approval required before scratching.");
      else if (m.includes("DISABLED")) toast.error("The scratch card campaign is not active.");
      else toast.error(m);
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async (cardId: string) => {
    setBusy(cardId);
    try {
      const res = await claim(cardId);
      toast.success(res?.tx_hash ? "Claim broadcast on-chain!" : "Claim submitted.");
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("WALLET_ADDRESS")) toast.error("Set a valid wallet address in your profile first.");
      else if (m.includes("KYC")) toast.error("KYC approval required before claiming.");
      else toast.error(m);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
      {/* Hero header */}
      <header
        className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background:
            "radial-gradient(130% 120% at 0% 0%, hsl(223 32% 13%), hsl(222 39% 8%) 70%)",
          border: "1px solid hsl(45 90% 55% / 0.2)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(45 95% 60% / 0.6), transparent 70%)" }}
        />
        <div className="relative z-10">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
            <Sparkles className="h-6 w-6 text-amber-300" />
            Scratch &amp; Win
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Earn a scratch card every time someone you referred joins. Scratch to reveal {range} BSK,
            then claim it straight to your on-chain wallet.
          </p>
          {summary.total > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summary.scratchable > 0 && (
                <Stat label="Ready" value={summary.scratchable} />
              )}
              {summary.claimable > 0 && <Stat label="Claimable" value={summary.claimable} />}
              {summary.pending > 0 && <Stat label="Pending" value={summary.pending} />}
              {summary.claimed > 0 && <Stat label="Claimed" value={summary.claimed} />}
            </div>
          )}
        </div>
      </header>

      {config && !config.is_enabled && (
        <Card className="flex items-center gap-3 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
          <Lock className="h-4 w-4 shrink-0" />
          The scratch card campaign is currently paused.
        </Card>
      )}

      {locked && (
        <Card className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">KYC required to unlock rewards</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Complete and get KYC approved to unlock your Scratch Card reward.
            </p>
            <Button size="sm" className="mt-3" onClick={() => navigate("/app/profile/kyc")}>
              Complete KYC
            </Button>
          </div>
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
            Invite friends with your referral link — each referral that signs up earns you a card.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/app/profile/referrals")}>
            <Users className="mr-2 h-4 w-4" /> Invite friends
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <ScratchCardTile
              key={card.id}
              card={card}
              payout={payouts[card.id]}
              batch={payouts[card.id]?.batch_id ? batches[payouts[card.id].batch_id as string] : undefined}
              campaignEnabled={!!config?.is_enabled}
              requireKyc={!!config?.require_kyc}
              kycApproved={!!kyc?.isApproved}
              busy={busy === card.id}
              onReveal={handleReveal}
              onClaim={handleClaim}
              onCompleteKyc={() => navigate("/app/profile/kyc")}
              celebrate
            />
          ))}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
      <span className="font-bold text-foreground">{value}</span> {label}
    </span>
  );
}
