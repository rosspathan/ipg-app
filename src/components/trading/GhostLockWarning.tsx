import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useHasGhostLocks } from '@/hooks/useBalanceReconciliation';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that warns users if they have "ghost locks" - 
 * funds locked in balance but no corresponding open orders.
 * 
 * Admins can fix ghost locks with a button click.
 */
export function GhostLockWarning() {
  const { hasGhostLocks, discrepancies, isLoading } = useHasGhostLocks();
  const { isAdmin } = useAdminCheck();
  const [isFixing, setIsFixing] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading || !hasGhostLocks) {
    return null;
  }

  const handleFixGhostLocks = async () => {
    try {
      setIsFixing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('admin-fix-ghost-locks', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Ghost locks fixed', {
          description: `Released ${data.fixed_count} stuck balance(s)`
        });
        
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['balance-reconciliation'] });
        queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
        queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
      } else {
        throw new Error(data?.error || 'Fix failed');
      }
    } catch (error: any) {
      console.error('[GhostLockWarning] Fix error:', error);
      toast.error('Failed to fix ghost locks', {
        description: error.message
      });
    } finally {
      setIsFixing(false);
    }
  };

  const ghostLockDetails = discrepancies
    .filter(d => d.discrepancy > 0.00001)
    .map(d => `${d.discrepancy.toFixed(4)} ${d.asset_symbol}`)
    .join(', ');

  return (
    <Alert variant="destructive" className="mb-4 bg-amber-500/10 border-amber-500/50">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600">Locked Balance Mismatch</AlertTitle>
      <AlertDescription className="text-amber-600/90">
        <p className="mb-2">
          You have locked funds that don't match your open orders: {ghostLockDetails}
        </p>
        <p className="text-xs mb-3 text-muted-foreground">
          This can happen due to system issues. {isAdmin ? 'Click below to release these funds.' : 'Please contact support to release these funds.'}
        </p>
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleFixGhostLocks}
            disabled={isFixing}
            className="bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30 text-amber-600"
          >
            {isFixing ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Release Stuck Funds
              </>
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
