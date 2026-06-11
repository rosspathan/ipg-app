import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

export interface ScratchCard {
  id: string;
  status: string;
  reward_amount_bsk: number | null;
  source: string | null;
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

export function useScratchCards() {
  const { user } = useAuthUser();
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [payouts, setPayouts] = useState<Record<string, ScratchPayout>>({});
  const [batches, setBatches] = useState<Record<string, ScratchBatch>>({});
  const [config, setConfig] = useState<ScratchConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cardsRes, payoutsRes, batchesRes, cfgRes] = await Promise.all([
        supabase
          .from("scratch_cards")
          .select("id,status,reward_amount_bsk,source,revealed_at,claimed_at,created_at")
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

      setCards((cardsRes.data ?? []) as ScratchCard[]);
      const pMap: Record<string, ScratchPayout> = {};
      for (const p of (payoutsRes.data ?? []) as ScratchPayout[]) pMap[p.card_id] = p;
      setPayouts(pMap);
      const bMap: Record<string, ScratchBatch> = {};
      for (const b of (batchesRes.data ?? []) as ScratchBatch[]) bMap[b.id] = b;
      setBatches(bMap);
      setConfig((cfgRes.data ?? null) as ScratchConfig | null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const reveal = useCallback(
    async (cardId: string) => {
      const { data, error } = await supabase.rpc("scratch_card_reveal", { p_card_id: cardId });
      if (error) throw new Error(error.message);
      await load();
      return data as { status: string; reward_bsk: number };
    },
    [load],
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
      await load();
      return data as { batch_id: string; tx_hash: string | null };
    },
    [load],
  );

  return { cards, payouts, batches, config, loading, reload: load, reveal, claim };
}
