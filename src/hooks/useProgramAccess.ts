import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBSKBalance } from "./useUserBSKBalance";

interface ProgramAccessCheck {
  hasAccess: boolean;
  reason?: string;
  requiredBalance?: number;
  userBalance?: number;
  loading: boolean;
}

/**
 * Hook to check if user has sufficient balance to access a program
 * @param programKey - The program module key (e.g., 'ad-mining', 'lucky-draw')
 * @param requiredBalanceOverride - Optional override for required balance (defaults to config)
 */
export function useProgramAccess(
  programKey: string,
  requiredBalanceOverride?: number
): ProgramAccessCheck {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [reason, setReason] = useState<string>();
  const [requiredBalance, setRequiredBalance] = useState<number>(0);
  const { balance: bskBalance, loading: balanceLoading } = useUserBSKBalance();

  useEffect(() => {
    checkAccess();
  }, [programKey, bskBalance.withdrawable, balanceLoading]);

  const checkAccess = async () => {
    if (balanceLoading) {
      setLoading(true);
      return;
    }

    try {
      // If override provided, use it directly
      if (requiredBalanceOverride !== undefined) {
        const canAccess = bskBalance.withdrawable >= requiredBalanceOverride;
        setHasAccess(canAccess);
        setRequiredBalance(requiredBalanceOverride);
        if (!canAccess) {
          setReason(`Insufficient balance. Required: ${requiredBalanceOverride} BSK, Available: ${bskBalance.withdrawable.toFixed(2)} BSK`);
        }
        setLoading(false);
        return;
      }

      // Fetch program config from database
      const { data: programConfig, error } = await supabase
        .rpc('get_current_program_config', { p_module_key: programKey });

      if (error) {
        console.error('Error fetching program config:', error);
        setHasAccess(true); // Allow access if config fetch fails (graceful degradation)
        setLoading(false);
        return;
      }

      // Extract required balance from config
      let required = 0;
      if (programConfig && typeof programConfig === 'object' && !Array.isArray(programConfig)) {
        const config = programConfig as Record<string, any>;
        // Different programs have different config structures
        if (config.subscription_cost) {
          required = parseFloat(config.subscription_cost);
        } else if (config.entry_fee) {
          required = parseFloat(config.entry_fee);
        } else if (config.ticket_price) {
          required = parseFloat(config.ticket_price);
        } else if (config.min_bet) {
          required = parseFloat(config.min_bet);
        } else if (config.min_stake) {
          required = parseFloat(config.min_stake);
        }
      }

      setRequiredBalance(required);
      const canAccess = bskBalance.withdrawable >= required;
      setHasAccess(canAccess);
      
      if (!canAccess && required > 0) {
        setReason(`Insufficient balance. Required: ${required.toFixed(2)} BSK, Available: ${bskBalance.withdrawable.toFixed(2)} BSK`);
      }
    } catch (error) {
      console.error('Error checking program access:', error);
      setHasAccess(true); // Graceful degradation
    } finally {
      setLoading(false);
    }
  };

  return {
    hasAccess,
    reason,
    requiredBalance,
    userBalance: bskBalance.withdrawable,
    loading
  };
}
