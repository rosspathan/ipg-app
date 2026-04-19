import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TokenSolvency {
  asset_symbol: string;
  user_available: number;
  user_locked: number;
  total_user_liability: number;
  pending_withdrawals: number;
  platform_fees_owed: number;
  required_balance: number;
  actual_onchain_balance: number;
  surplus_or_deficit: number;
  status: "solvent" | "warning" | "insolvent";
  drift_users_count: number;
  total_drift_amount: number;
  wallet_address: string;
}

export interface SolvencyResponse {
  wallet: string;
  snapshot_at: string;
  results: TokenSolvency[];
}

/** Live solvency snapshot for the trading hot wallet (token-by-token). */
export function useHotWalletSolvency(persist = false) {
  return useQuery({
    queryKey: ["hot-wallet-solvency", persist],
    queryFn: async (): Promise<SolvencyResponse> => {
      const { data, error } = await supabase.functions.invoke(
        "hot-wallet-solvency",
        { body: {}, method: "GET" as any }
      );
      if (error) throw error;
      // Edge function reads `persist` from query string; pass via URL trick:
      return data as SolvencyResponse;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Persist a snapshot + auto-toggle circuit breakers. */
export function usePersistSolvencySnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = `https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/hot-wallet-solvency?persist=true`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A",
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as SolvencyResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hot-wallet-solvency"] });
      qc.invalidateQueries({ queryKey: ["solvency-history"] });
      qc.invalidateQueries({ queryKey: ["circuit-breakers"] });
      toast.success("Solvency snapshot persisted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Snapshot failed"),
  });
}

/** Recent persisted snapshots for trend visibility. */
export function useSolvencyHistory(symbol?: string, limit = 50) {
  return useQuery({
    queryKey: ["solvency-history", symbol, limit],
    queryFn: async () => {
      let q = supabase
        .from("hot_wallet_solvency_snapshots")
        .select("*")
        .order("snapshot_at", { ascending: false })
        .limit(limit);
      if (symbol) q = q.eq("asset_symbol", symbol);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

/** Drift users for a given token. */
export function useDriftUsers(symbol: string) {
  return useQuery({
    queryKey: ["drift-users", symbol],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "detect_balance_drift_users",
        { p_asset_symbol: symbol }
      );
      if (error) throw error;
      return data as Array<{
        user_id: string;
        username: string;
        asset_symbol: string;
        table_available: number;
        table_locked: number;
        ledger_available: number;
        ledger_locked: number;
        drift_available: number;
        drift_locked: number;
        total_drift: number;
      }>;
    },
    enabled: !!symbol,
    staleTime: 30_000,
  });
}

/** Repair a single user's balance drift. */
export function useRepairDrift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      user_id: string;
      asset_symbol: string;
      decision: "trust_balance_table" | "trust_ledger";
      reason: string;
      batch_id: string;
    }) => {
      const { data, error } = await supabase.rpc("repair_user_balance_drift", {
        p_user_id: args.user_id,
        p_asset_symbol: args.asset_symbol,
        p_decision: args.decision,
        p_reason: args.reason,
        p_batch_id: args.batch_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drift-users"] });
      qc.invalidateQueries({ queryKey: ["hot-wallet-solvency"] });
      toast.success("Drift repaired");
    },
    onError: (e: any) => toast.error(e?.message ?? "Repair failed"),
  });
}

/** Active circuit breakers per token. */
export function useCircuitBreakers() {
  return useQuery({
    queryKey: ["circuit-breakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_circuit_breaker")
        .select("*")
        .eq("is_frozen", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

/** Toggle circuit breaker manually. */
export function useToggleCircuitBreaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      asset_symbol: string;
      freeze: boolean;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "set_withdrawal_circuit_breaker",
        {
          p_asset_symbol: args.asset_symbol,
          p_freeze: args.freeze,
          p_reason: args.reason,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["circuit-breakers"] });
      toast.success("Circuit breaker updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
}

/** Refill history. */
export function useRefillHistory(limit = 50) {
  return useQuery({
    queryKey: ["hot-wallet-refills", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hot_wallet_refills")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

/** Record a refill (manual entry by admin after sending tokens on-chain). */
export function useRecordRefill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      asset_symbol: string;
      expected_amount: number;
      detected_amount: number;
      tx_hash: string;
      from_address: string;
      block_number?: number;
      shortfall_before: number;
      surplus_after: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("record_hot_wallet_refill", {
        p_wallet_address: "0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5",
        p_asset_symbol: args.asset_symbol,
        p_expected_amount: args.expected_amount,
        p_detected_amount: args.detected_amount,
        p_tx_hash: args.tx_hash,
        p_from_address: args.from_address,
        p_block_number: args.block_number ?? 0,
        p_shortfall_before: args.shortfall_before,
        p_surplus_after: args.surplus_after,
        p_notes: args.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hot-wallet-refills"] });
      qc.invalidateQueries({ queryKey: ["hot-wallet-solvency"] });
      toast.success("Refill recorded");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record refill"),
  });
}

/** Fee ownership report. */
export function useFeeOwnership() {
  return useQuery({
    queryKey: ["fee-ownership"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fee_ownership_report");
      if (error) throw error;
      return data as Array<{
        asset_symbol: string;
        accrued_fees: number;
        swept_fees: number;
        outstanding_fees: number;
      }>;
    },
    staleTime: 60_000,
  });
}
