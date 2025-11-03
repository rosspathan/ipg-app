import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      console.error('Role check error:', roleError)
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { user_id, email, confirm, confirmForce } = await req.json()

    // Validate confirmation
    if (confirm !== 'DELETE') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid confirmation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let targetUserId = user_id

    // Resolve email to user_id if provided
    if (!targetUserId && email) {
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = userData.users.find(u => u.email === email)
      if (targetUser) {
        targetUserId = targetUser.id
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if target user is admin
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('role', 'admin')
      .single()

    if (targetRoleData && !confirmForce) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete admin user without confirmForce' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting deletion for user: ${targetUserId}`)

    const tablesCleared: string[] = []
    const errors: string[] = []

    // Delete from tables in order (respecting foreign keys)
    const tablesToClear = [
      'referral_tree',
      'user_bsk_balances',
      'user_bsk_vesting',
      'bsk_vesting_releases',
      'bsk_vesting_referral_rewards',
      'wallet_bonus_balances',
      'bonus_ledger',
      'user_badge_status',
      'badge_qualification_events',
      'direct_referrer_rewards',
      'user_wallets',
      'wallet_balances',
      'user_gamification_stats',
      'user_achievements',
      'daily_rewards',
      'kyc_submissions',
      'referral_links',
      'referral_relationships',
      'user_promotion_claims',
      'lucky_draw_tickets',
      'fiat_bank_accounts',
      'fiat_upi_accounts',
      'fiat_deposits',
      'fiat_withdrawals',
      'crypto_to_inr_requests',
      'deposits',
      'withdrawals',
      'orders',
      'user_insurance_subscriptions',
      'support_tickets',
      'support_messages',
      'audit_logs',
      'user_roles',
    ]

    for (const table of tablesToClear) {
      try {
        // Handle referral_tree separately (has both user_id and ancestor_id)
        if (table === 'referral_tree') {
          const { error: e1 } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('user_id', targetUserId)
          
          const { error: e2 } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('ancestor_id', targetUserId)

          if (!e1 && !e2) {
            tablesCleared.push(table)
          } else {
            if (e1) errors.push(`${table} (user_id): ${e1.message}`)
            if (e2) errors.push(`${table} (ancestor_id): ${e2.message}`)
          }
          continue
        }

        // Handle referral_relationships (has referrer_id and referee_id)
        if (table === 'referral_relationships') {
          const { error: e1 } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('referrer_id', targetUserId)
          
          const { error: e2 } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('referee_id', targetUserId)

          if (!e1 && !e2) {
            tablesCleared.push(table)
          } else {
            if (e1) errors.push(`${table} (referrer_id): ${e1.message}`)
            if (e2) errors.push(`${table} (referee_id): ${e2.message}`)
          }
          continue
        }

        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', targetUserId)

        if (!error) {
          tablesCleared.push(table)
        } else {
          // Only log as error if it's not a "table doesn't exist" or "no rows" error
          if (!error.message.includes('does not exist') && !error.message.includes('No rows found')) {
            errors.push(`${table}: ${error.message}`)
          }
        }
      } catch (err: any) {
        errors.push(`${table}: ${err.message}`)
      }
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', targetUserId)

    if (!profileError) {
      tablesCleared.push('profiles')
    } else {
      errors.push(`profiles: ${profileError.message}`)
    }

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (authDeleteError) {
      errors.push(`auth.users: ${authDeleteError.message}`)
    }

    console.log(`Deletion complete for user: ${targetUserId}`)
    console.log(`Tables cleared: ${tablesCleared.length}`)
    console.log(`Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        deletedAuthUser: !authDeleteError,
        deletedProfile: !profileError,
        tablesCleared,
        errors,
        message: errors.length === 0 
          ? 'User and all associated data deleted successfully' 
          : `Deletion completed with ${errors.length} errors`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in admin-delete-user:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
