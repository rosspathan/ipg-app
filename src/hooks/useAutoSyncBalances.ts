import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useBep20Balances } from '@/hooks/useBep20Balances'

/**
 * Auto-syncs on-chain balances to wallet_balances table for trading.
 * Runs automatically on mount and when balances change.
 * Preserves locked amounts (never resets to 0).
 */
export function useAutoSyncBalances() {
  const { user } = useAuthUser()
  const { balances, isLoading } = useBep20Balances()
  const syncedRef = useRef<Set<string>>(new Set())
  const isSyncingRef = useRef(false)

  useEffect(() => {
    if (!user?.id || isLoading || balances.length === 0 || isSyncingRef.current) return

    const syncBalances = async () => {
      isSyncingRef.current = true
      
      try {
        // Get assets with on-chain balance > 0
        const assetsToSync = balances.filter(b => b.onchainBalance > 0)
        
        if (assetsToSync.length === 0) {
          isSyncingRef.current = false
          return
        }

        // Skip if already synced these assets in this session
        const newAssets = assetsToSync.filter(a => !syncedRef.current.has(a.assetId))
        if (newAssets.length === 0) {
          isSyncingRef.current = false
          return
        }

        console.log('[useAutoSyncBalances] Syncing', newAssets.length, 'assets')

        // Fetch current wallet_balances to get locked amounts
        const { data: existingBalances } = await supabase
          .from('wallet_balances')
          .select('asset_id, available, locked, total')
          .eq('user_id', user.id)
          .in('asset_id', newAssets.map(a => a.assetId))

        const existingMap = new Map(
          (existingBalances || []).map(b => [b.asset_id, b])
        )

        // Upsert each balance
        for (const asset of newAssets) {
          const existing = existingMap.get(asset.assetId)
          const currentLocked = existing?.locked || 0
          const currentTotal = existing?.total || 0
          
          // Only sync if on-chain is greater than current total
          if (asset.onchainBalance > currentTotal) {
            const newTotal = asset.onchainBalance
            const newAvailable = Math.max(0, newTotal - currentLocked)

            const { error } = await supabase
              .from('wallet_balances')
              .upsert({
                user_id: user.id,
                asset_id: asset.assetId,
                available: newAvailable,
                locked: currentLocked,
                total: newTotal,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,asset_id'
              })

            if (error) {
              console.error('[useAutoSyncBalances] Failed to sync', asset.symbol, error)
            } else {
              console.log('[useAutoSyncBalances] Synced', asset.symbol, ':', newTotal)
              syncedRef.current.add(asset.assetId)
            }
          } else {
            // Mark as synced even if no update needed
            syncedRef.current.add(asset.assetId)
          }
        }
      } catch (err) {
        console.error('[useAutoSyncBalances] Sync error:', err)
      } finally {
        isSyncingRef.current = false
      }
    }

    syncBalances()
  }, [user?.id, balances, isLoading])
}
