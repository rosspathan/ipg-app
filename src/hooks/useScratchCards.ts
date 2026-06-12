import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

export interface ScratchCard {
  id: string;
  status: string;
  reward_amount_bsk: number | null;
  source: string | null;
  source_ref: string | null;
  revealed_at: string | null;
  claimed_at: string | null;
  created_at: string;
}

export interface ScratchPayout {
  card_id: string;
  amount_bsk: number;
  status: string;
  batch_id: string | null;
}

export interface ScratchBatch {
  id: string;
  status: string;
  tx_hash: string | null;
  total_amount_bsk: number;
}

export interface ScratchConfig {
  is_enabled: boolean;
  launch_phase: number;
  min_reward_bsk: number;
  max_reward_bsk: number;
  require_kyc: boolean;
}

export interface ScratchSummary {
  total: number;
  /** unscratched cards waiting to be scratched */
  scratchable: number;
  /** revealed and ready to claim on-chain */
  claimable: number;
  /** revealed but reward pool not yet funded */
  pending: number;
  /** claim broadcasting / in-flight */
  claiming: number;
  /** fully paid out */
  claimed: number;
}

interface ScratchData {
  cards: ScratchCard[];
  payouts: Record<string, ScratchPayout>;
  batches: Record<string, ScratchBatch>;
  config: ScratchConfig | null;
}

const EMPTY: ScratchData = { cards: [], payouts: {}, batches: {}, config: null };

export const SCRATCH_QUERY_KEY = ["scratch-cards"] as const;

export function useScratchCards() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();

  const query = useQuery<ScratchData>({
    queryKey: [...SCRATCH_QUERY_KEY, user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async () => {
      if (!user) return EMPTY;
      const [cardsRes, payoutsRes, batchesRes, cfgRes] = await Promise.all([
        supabase
          .from("scratch_cards")
          .select("id,status,reward_amount_bsk,source,source_ref,revealed_at,claimed_at,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("scratch_card_payouts")
          .select("card_id,amount_bsk,status,batch_id")
          .eq("user_id", user.id),
        supabase
          .from("scratch_card_claim_batches")
          .select("id,status,tx_hash,total_amount_bsk")
          .eq("user_id", user.id),
        supabase
          .from("scratch_card_config")
          .select("is_enabled,launch_phase,min_reward_bsk,max_reward_bsk,require_kyc")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const cards = (cardsRes.data ?? []) as ScratchCard[];
      const payouts: Record<string, ScratchPayout> = {};
      for (const p of (payoutsRes.data ?? []) as ScratchPayout[]) payouts[p.card_id] = p;
      const batches: Record<string, ScratchBatch> = {};
      for (const b of (batchesRes.data ?? []) as ScratchBatch[]) batches[b.id] = b;
      const config = (cfgRes.data ?? null) as ScratchConfig | null;
      return { cards, payouts, batches, config };
    },
  });

  const data = query.data ?? EMPTY;

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SCRATCH_QUERY_KEY });
  }, [queryClient]);

  const reveal = useCallback(
    async (cardId: string) => {
      const { data, error } = await supabase.rpc("scratch_card_reveal", { p_card_id: cardId });
      if (error) throw new Error(error.message);
      await reload();
      return data as unknown as { status: string; reward_bsk: number };
    },
    [reload],
  );

  const claim = useCallback(
    async (cardId: string) => {
      const { data, error } = await supabase.functions.invoke("scratch-claim", {
        body: { card_id: cardId },
      });
      if (error) throw new Error(error.message);
      if (data && (data as { success?: boolean }).success === false) {
        throw new Error((data as { error?: string }).error ?? "Claim failed");
      }
      await reload();
      return data as { batch_id: string; tx_hash: string | null };
    },
    [reload],
  );

  const summary = useMemo<ScratchSummary>(() => {
    const s: ScratchSummary = {
      total: data.cards.length,
      scratchable: 0,
      claimable: 0,
      pending: 0,
      claiming: 0,
      claimed: 0,
    };
    for (const c of data.cards) {
      switch (c.status) {
        case "unscratched":
          s.scratchable++;
          break;
        case "claimable":
          s.claimable++;
          break;
        case "treasury_pending":
          s.pending++;
          break;
        case "claiming":
          s.claiming++;
          break;
        case "claimed":
          s.claimed++;
          break;
        default:
          break;
      }
    }
    return s;
  }, [data.cards]);

  return {
    cards: data.cards,
    payouts: data.payouts,
    batches: data.batches,
    config: data.config,
    summary,
    loading: query.isLoading,
    reload,
    reveal,
    claim,
  };
}
