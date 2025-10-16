import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { drawId, ticketCount } = await req.json()

    if (!drawId || !ticketCount || ticketCount < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get draw configuration from draw_templates
    const { data: drawConfig, error: drawError } = await supabase
      .from('draw_templates')
      .select('*')
      .eq('id', drawId)
      .eq('is_active', true)
      .single()

    if (drawError || !drawConfig) {
      console.error('Draw config error:', drawError)
      return new Response(
        JSON.stringify({ error: 'Draw not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ticketPrice = drawConfig.ticket_price_bsk || 100
    const totalCost = ticketPrice * ticketCount

    console.log('Purchase request:', { user: user.id, drawId, ticketCount, ticketPrice, totalCost })

    // 2. Check user's BSK balance
    const { data: bskBalance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (balanceError) {
      console.error('Balance check error:', balanceError)
    }

    if (!bskBalance || bskBalance.withdrawable_balance < totalCost) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient BSK balance',
          required: totalCost,
          available: bskBalance?.withdrawable_balance || 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Check pool capacity (if pool_size is set)
    if (drawConfig.pool_size) {
      const { count: currentParticipants } = await supabase
        .from('lucky_draw_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', drawId)

      const remainingSlots = drawConfig.pool_size - (currentParticipants || 0)
      if (ticketCount > remainingSlots) {
        return new Response(
          JSON.stringify({
            error: 'Not enough space in pool',
            requested: ticketCount,
            available: remainingSlots
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 4. Deduct BSK from user
    const { error: deductError } = await supabase
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: bskBalance.withdrawable_balance - totalCost
      })
      .eq('user_id', user.id)

    if (deductError) {
      console.error('Deduct error:', deductError)
      throw new Error('Failed to deduct BSK')
    }

    // 5. Create tickets
    const tickets = []
    for (let i = 0; i < ticketCount; i++) {
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      tickets.push({
        user_id: user.id,
        config_id: drawId,
        ticket_number: ticketNumber,
        status: 'pending',
        ipg_paid: 0,
        bsk_paid: ticketPrice
      })
    }

    const { data: createdTickets, error: ticketError } = await supabase
      .from('lucky_draw_tickets')
      .insert(tickets)
      .select()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      
      // Rollback: refund BSK
      await supabase
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: bskBalance.withdrawable_balance
        })
        .eq('user_id', user.id)
      
      throw new Error('Failed to create tickets')
    }

    // 6. Create bonus ledger entry
    await supabase
      .from('bonus_ledger')
      .insert({
        user_id: user.id,
        type: 'lucky_draw_purchase',
        amount_bsk: -totalCost,
        meta_json: {
          draw_id: drawId,
          tickets_purchased: ticketCount,
          ticket_price: ticketPrice
        }
      })

    console.log('Success! Created tickets:', createdTickets?.length)

    return new Response(
      JSON.stringify({
        success: true,
        tickets_created: ticketCount,
        total_cost: totalCost,
        tickets: createdTickets,
        remaining_balance: bskBalance.withdrawable_balance - totalCost
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error purchasing tickets:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
