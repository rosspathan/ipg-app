import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: { user: adminUser }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !adminUser) {
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

    const body = await req.json()
    const { user_email, user_id, action } = body

    if (!user_email && !user_id) {
      return new Response(
        JSON.stringify({ error: 'Either user_email or user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find user
    let targetUserId = user_id
    let targetEmail = user_email

    if (!targetUserId && user_email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', user_email)
        .single()
      
      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      targetUserId = profile.user_id
      targetEmail = profile.email
    }

    console.log(`[ADMIN_RESET] Admin ${adminUser.email} performing action "${action || 'reset'}" on user ${targetEmail} (${targetUserId})`)

    const results: Record<string, any> = {}

    if (action === 'align_bsc') {
      // Simple fix: align bsc_wallet_address to wallet_address
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', targetUserId)
        .single()

      if (profile?.wallet_address) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            bsc_wallet_address: profile.wallet_address,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', targetUserId)

        results.align_bsc = error ? { error: error.message } : { success: true, aligned_to: profile.wallet_address }
      } else {
        results.align_bsc = { error: 'No wallet_address to align to' }
      }
    } else if (action === 'align_to_backup') {
      // Align profile wallet to backup wallet (seed-phrase derived)
      const { data: backup } = await supabase
        .from('encrypted_wallet_backups')
        .select('wallet_address')
        .eq('user_id', targetUserId)
        .single()

      if (backup?.wallet_address) {
        const walletAddresses = {
          evm: { mainnet: backup.wallet_address, bsc: backup.wallet_address },
          'bsc-mainnet': backup.wallet_address,
          'evm-mainnet': backup.wallet_address,
          bsc: backup.wallet_address
        }

        const { error } = await supabase
          .from('profiles')
          .update({ 
            wallet_address: backup.wallet_address,
            bsc_wallet_address: backup.wallet_address,
            wallet_addresses: walletAddresses,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', targetUserId)

        results.align_to_backup = error ? { error: error.message } : { success: true, aligned_to: backup.wallet_address }
      } else {
        results.align_to_backup = { error: 'No backup wallet found' }
      }
    } else {
      // Default action: full reset
      // 1. Delete encrypted wallet backups
      const { error: backupErr } = await supabase
        .from('encrypted_wallet_backups')
        .delete()
        .eq('user_id', targetUserId)
      results.delete_backup = backupErr ? { error: backupErr.message } : { success: true }

      // 2. Delete user_wallets entries
      const { error: walletsErr } = await supabase
        .from('user_wallets')
        .delete()
        .eq('user_id', targetUserId)
      results.delete_user_wallets = walletsErr ? { error: walletsErr.message } : { success: true }

      // 3. Clear wallet addresses from profile and reset onboarding
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          wallet_address: null,
          bsc_wallet_address: null,
          wallet_addresses: null,
          onboarding_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId)
      results.clear_profile = profileErr ? { error: profileErr.message } : { success: true }

      // 4. Delete wallet balances (optional - may want to keep for audit)
      const { error: balanceErr } = await supabase
        .from('wallet_balances')
        .delete()
        .eq('user_id', targetUserId)
      results.delete_balances = balanceErr ? { error: balanceErr.message } : { success: true }
    }

    // Log admin action
    await supabase.from('admin_actions_log').insert({
      admin_user_id: adminUser.id,
      action_type: `wallet_${action || 'reset'}`,
      target_table: 'profiles',
      target_id: targetUserId,
      details: {
        target_email: targetEmail,
        results
      }
    })

    console.log(`[ADMIN_RESET] Completed wallet ${action || 'reset'} for ${targetEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: targetUserId,
        email: targetEmail,
        action: action || 'reset',
        results,
        message: action === 'align_bsc' 
          ? 'BSC wallet aligned to profile wallet' 
          : action === 'align_to_backup'
          ? 'Profile wallet aligned to backup (seed-phrase derived)'
          : 'Wallet data reset. User will be prompted to create a new wallet on next login.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ADMIN_RESET] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Reset failed', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
