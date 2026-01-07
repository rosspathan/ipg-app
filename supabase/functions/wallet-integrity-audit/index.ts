import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MismatchedUser {
  user_id: string
  email: string
  profile_wallet: string | null
  profile_bsc_wallet: string | null
  backup_wallet: string | null
  mismatch_type: 'profile_vs_backup' | 'profile_vs_bsc' | 'both'
  recommended_action: string
  created_at: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAuth.rpc('has_role', { role_name: 'admin' })
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[WALLET_AUDIT] Starting wallet integrity audit...')

    // Query 1: Find users where profile.wallet_address != encrypted_wallet_backups.wallet_address
    const { data: backupMismatches, error: backupError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        email,
        wallet_address,
        bsc_wallet_address,
        created_at
      `)

    if (backupError) {
      console.error('[WALLET_AUDIT] Error fetching profiles:', backupError)
      throw backupError
    }

    // Get all encrypted wallet backups
    const { data: backups, error: backupsError } = await supabase
      .from('encrypted_wallet_backups')
      .select('user_id, wallet_address, created_at')

    if (backupsError) {
      console.error('[WALLET_AUDIT] Error fetching backups:', backupsError)
      throw backupsError
    }

    // Create lookup map for backups
    const backupMap = new Map<string, string>()
    for (const backup of backups || []) {
      if (backup.wallet_address) {
        backupMap.set(backup.user_id, backup.wallet_address)
      }
    }

    const mismatched: MismatchedUser[] = []

    for (const profile of backupMismatches || []) {
      const profileWallet = profile.wallet_address?.toLowerCase() || null
      const profileBscWallet = profile.bsc_wallet_address?.toLowerCase() || null
      const backupWallet = backupMap.get(profile.user_id)?.toLowerCase() || null

      let mismatchType: 'profile_vs_backup' | 'profile_vs_bsc' | 'both' | null = null
      
      const hasProfileVsBackupMismatch = backupWallet && profileWallet && profileWallet !== backupWallet
      const hasProfileVsBscMismatch = profileWallet && profileBscWallet && profileWallet !== profileBscWallet

      if (hasProfileVsBackupMismatch && hasProfileVsBscMismatch) {
        mismatchType = 'both'
      } else if (hasProfileVsBackupMismatch) {
        mismatchType = 'profile_vs_backup'
      } else if (hasProfileVsBscMismatch) {
        mismatchType = 'profile_vs_bsc'
      }

      if (mismatchType) {
        let recommendedAction = ''
        
        if (mismatchType === 'profile_vs_backup' || mismatchType === 'both') {
          // Backup wallet is authoritative - user should reset or align to backup
          recommendedAction = 'Reset wallet and create new, or align profile to backup wallet'
        } else if (mismatchType === 'profile_vs_bsc') {
          // Simple BSC alignment - can be auto-fixed
          recommendedAction = 'Auto-align bsc_wallet_address to wallet_address'
        }

        mismatched.push({
          user_id: profile.user_id,
          email: profile.email || 'unknown',
          profile_wallet: profile.wallet_address,
          profile_bsc_wallet: profile.bsc_wallet_address,
          backup_wallet: backupMap.get(profile.user_id) || null,
          mismatch_type: mismatchType,
          recommended_action: recommendedAction,
          created_at: profile.created_at
        })
      }
    }

    // Sort by mismatch severity (both > profile_vs_backup > profile_vs_bsc)
    mismatched.sort((a, b) => {
      const severityOrder = { 'both': 0, 'profile_vs_backup': 1, 'profile_vs_bsc': 2 }
      return severityOrder[a.mismatch_type] - severityOrder[b.mismatch_type]
    })

    console.log(`[WALLET_AUDIT] Found ${mismatched.length} users with wallet mismatches`)

    // Summary stats
    const summary = {
      total_users_audited: backupMismatches?.length || 0,
      total_with_backups: backups?.length || 0,
      total_mismatched: mismatched.length,
      breakdown: {
        profile_vs_backup: mismatched.filter(m => m.mismatch_type === 'profile_vs_backup').length,
        profile_vs_bsc: mismatched.filter(m => m.mismatch_type === 'profile_vs_bsc').length,
        both: mismatched.filter(m => m.mismatch_type === 'both').length,
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        mismatched_users: mismatched,
        audit_timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[WALLET_AUDIT] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Audit failed', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
