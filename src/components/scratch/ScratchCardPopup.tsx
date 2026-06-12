import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { Gift, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useScratchCards } from "@/hooks/useScratchCards";
import { useScratchPopupSeen } from "@/hooks/useScratchPopupSeen";
import { useKYCStatus } from "@/hooks/useKYCStatus";
import { useAuthUser } from "@/hooks/useAuthUser";
import { ScratchCardTile } from "./ScratchCardTile";
import type { ScratchCard } from "@/hooks/useScratchCards";

function popupMessage(card: ScratchCard | undefined, userId?: string) {
  if (!card) return { title: "New Scratch Card unlocked!", body: "" };
  const isReferee =
    card.source === "referral_welcome" ||
    (card.source === "referral_signup" && card.source_ref === userId);
  if (isReferee) {
    return {
      title: "Welcome aboard! 🎉",
      body: "You received a Scratch Card reward from your referral signup.",
    };
  }
  return {
    title: "Your referral joined! 🎉",
    body: "Your referral joined successfully! You received a Scratch Card reward.",
  };
}

const CANDIDATE_STATUSES = new Set(["unscratched", "claimable"]);

/**
 * Globally-mounted popup that surfaces newly issued / unclaimed scratch cards.
 * It reads real backend data only and uses a UI-only "seen" list so it never
 * re-opens for the same card on every page load.
 */
export function ScratchCardPopup() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const { cards, payouts, batches, config, reveal, claim } = useScratchCards();
  const { isSeen, markSeen } = useScratchPopupSeen();
  const { data: kyc } = useKYCStatus();

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevStatus = useRef<string | null>(null);

  const candidate = useMemo(
    () => cards.find((c) => CANDIDATE_STATUSES.has(c.status) && !isSeen(c.id)),
    [cards, isSeen],
  );

  // Auto-open for the first unseen eligible card.
  useEffect(() => {
    if (open || !candidate) return;
    setActiveId(candidate.id);
    prevStatus.current = candidate.status;
    setOpen(true);
    markSeen([candidate.id]);
    toast("New Scratch Card unlocked!", {
      icon: "🎁",
      description: "Open it to reveal your BSK reward.",
    });
  }, [candidate, open, markSeen]);

  const activeCard = useMemo(
    () => cards.find((c) => c.id === activeId),
    [cards, activeId],
  );

  // Trigger confetti when the active card flips from unscratched to revealed.
  useEffect(() => {
    if (!activeCard) return;
    if (prevStatus.current === "unscratched" && activeCard.status !== "unscratched") {
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 3500);
      return () => window.clearTimeout(t);
    }
    prevStatus.current = activeCard.status;
  }, [activeCard]);

  if (!user || !activeCard) return null;

  const msg = popupMessage(activeCard, user.id);

  const handleReveal = async (cardId: string) => {
    setBusy(true);
    try {
      const res = await reveal(cardId);
      if (res?.status === "claimable") {
        toast.success(`You won ${res.reward_bsk} BSK! Claim it to your wallet.`);
      } else {
        toast.info(`Revealed ${res?.reward_bsk ?? ""} BSK — pending reward pool funding.`);
      }
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("KYC")) toast.error("KYC approval required before scratching.");
      else if (m.includes("DISABLED")) toast.error("The scratch card campaign is not active.");
      else toast.error(m);
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async (cardId: string) => {
    setBusy(true);
    try {
      const res = await claim(cardId);
      toast.success(res?.tx_hash ? "Claim broadcast on-chain!" : "Claim submitted.");
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("WALLET_ADDRESS")) toast.error("Set a valid wallet address in your profile first.");
      else if (m.includes("KYC")) toast.error("KYC approval required before claiming.");
      else toast.error(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-sm overflow-hidden border-amber-500/20 p-0 [&>button]:hidden"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, hsl(223 32% 13%) 0%, hsl(222 39% 7%) 70%)",
        }}
      >
        {celebrate && (
          <div className="pointer-events-none fixed inset-0 z-[60]">
            <Confetti
              recycle={false}
              numberOfPieces={220}
              gravity={0.25}
              colors={["#fde68a", "#f59e0b", "#00e5ff", "#ffffff", "#caa24a"]}
            />
          </div>
        )}

        {/* close */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/40 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-5 pb-5 pt-7">
          {/* ambient glow */}
          <div
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(45 95% 60% / 0.5), transparent 70%)" }}
          />

          <div className="relative z-10 mb-4 text-center">
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, hsl(45 90% 55% / 0.25), hsl(186 100% 50% / 0.15))",
                border: "1px solid hsl(45 90% 55% / 0.35)",
              }}
            >
              <Gift className="h-7 w-7 text-amber-300" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">{msg.title}</h2>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground">{msg.body}</p>
          </div>

          <div className="relative z-10">
            <ScratchCardTile
              card={activeCard}
              payout={payouts[activeCard.id]}
              batch={payouts[activeCard.id]?.batch_id ? batches[payouts[activeCard.id].batch_id as string] : undefined}
              campaignEnabled={!!config?.is_enabled}
              requireKyc={!!config?.require_kyc}
              kycApproved={!!kyc?.isApproved}
              busy={busy}
              onReveal={handleReveal}
              onClaim={handleClaim}
              onCompleteKyc={() => {
                setOpen(false);
                navigate("/app/profile/kyc");
              }}
              celebrate
            />
          </div>

          <button
            onClick={() => {
              setOpen(false);
              navigate("/app/scratch-cards");
            }}
            className="relative z-10 mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" />
            View all my scratch cards
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
