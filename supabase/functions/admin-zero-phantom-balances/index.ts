import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All identified phantom account emails
const PHANTOM_EMAILS = [
  "aarthibodiga456@gmail.com",
  "annepuharinarayana@gmail.com",
  "narsimhaaenugula1986@gmail.com",
  "nookarajuabi@gmail.com",
  "ateegala966@gmail.com",
  "houseofcomfort1@gmail.com",
  "kslsrinivas@gmail.com",
  "vbirsu0@gmail.com",
  "sridevibangaru1990@gmail.com",
  "suryanarayanayarra234@gmail.com",
  "sundillarammurthi123@gmail.com",
  "simhadriyerra@gmail.com",
  "devakidevibollini@gmail.com",
  "rsrao1977@gmail.com",
  "vacharusrinivasulu3733@gmai.com",
  "sraokommu@gmail.com",
  "prabhagopidesi@gmail.com",
  "banalasathish143@gmail.com",
  "vasanthavasu200@gmail.com",
  "simmavasu93@gmail.com",
  "krishnamurthyhs1966@gmail.com",
  "sivakrishnareddi4629@gmail.com",
  "prashanthitheppavari@gmail.com",
  "chmanimala005@gmail.com",
  "dharmasagarboppa@gmail.com",
  "jayraju95@gmail.com",
  "anithadwara009@gmail.com",
  "kailasavasa108@gmail.com",
  "nbabukaruna@gmail.com",
  "palinaganesh6@gmail.com",
  "rammurthy3064@gmail.com",
  "reyanshp1974@gmail.com",
  "akuthotavenkatesh@123mail.com",
  "immidisettisatyanarayana8@gmail.com",
  "togubhimsen1234@gmail.com",
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify admin auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAuth = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify admin role
    const { data: adminRole } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const results: any[] = []

    // Get user IDs for all phantom emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .in('email', PHANTOM_EMAILS)

    if (profilesError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[PHANTOM-ZERO] Admin ${user.email} zeroing ${profiles?.length ?? 0} phantom accounts`)

    for (const profile of (profiles || [])) {
      const userId = profile.user_id
      const email = profile.email

      // 1. Cancel all active/open orders for this user
      const { data: cancelledOrders, error: orderErr } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('status', ['open', 'partially_filled'])
        .select('id, side, pair')

      // 2. Zero out all wallet_balances
      const { data: balancesBefore, error: balErr } = await supabase
        .from('wallet_balances')
        .select('id, asset_id, available, locked')
        .eq('user_id', userId)

      const { error: zeroErr } = await supabase
        .from('wallet_balances')
        .update({ available: 0, locked: 0 })
        .eq('user_id', userId)

      results.push({
        email,
        user_id: userId,
        balances_zeroed: balancesBefore?.length ?? 0,
        previous_balances: balancesBefore?.map(b => ({
          asset_id: b.asset_id,
          was_available: b.available,
          was_locked: b.locked
        })),
        orders_cancelled: cancelledOrders?.length ?? 0,
        cancelled_order_ids: cancelledOrders?.map(o => o.id),
        balance_error: zeroErr?.message || null,
        order_error: orderErr?.message || null,
      })

      console.log(`[PHANTOM-ZERO] ${email}: zeroed ${balancesBefore?.length ?? 0} balances, cancelled ${cancelledOrders?.length ?? 0} orders`)
    }

    // Log admin action
    await supabase.from('admin_actions_log').insert({
      admin_user_id: user.id,
      action_type: 'phantom_balances_zeroed',
      target_table: 'wallet_balances',
      details: {
        accounts_processed: results.length,
        total_emails: PHANTOM_EMAILS.length,
        summary: results
      }
    })

    const notFound = PHANTOM_EMAILS.filter(
      e => !(profiles || []).find(p => p.email === e)
    )

    return new Response(JSON.stringify({
      success: true,
      accounts_processed: results.length,
      emails_not_found: notFound,
      results,
      executed_by: user.email,
      executed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[PHANTOM-ZERO] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
