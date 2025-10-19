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

    const { drawId } = await req.json()

    if (!drawId) {
      return new Response(
        JSON.stringify({ error: 'Draw ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Executing draw:', drawId)

    // 1. Get draw template
    const { data: template, error: templateError } = await supabase
      .from('draw_templates')
      .select('*')
      .eq('id', drawId)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Draw not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get all tickets for this draw
    const { data: tickets, error: ticketsError } = await supabase
      .from('lucky_draw_tickets')
      .select('id, user_id, ticket_number')
      .eq('config_id', drawId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      throw new Error('Failed to fetch tickets')
    }

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tickets found for this draw' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${tickets.length} tickets for draw`)

    // 3. Get current RNG seed
    const { data: seedData } = await supabase
      .from('rng_seeds')
      .select('id, server_seed, server_seed_hash')
      .is('valid_to', null)
      .order('valid_from', { ascending: false })
      .limit(1)
      .single()

    if (!seedData) {
      throw new Error('No active RNG seed found')
    }

    // 4. Generate provably fair random selection
    const serverSeed = seedData.server_seed
    const clientSeed = drawId // Use draw ID as client seed
    const nonce = Date.now()

    // Simple hash-based selection (in production, use proper provably fair algorithm)
    const hashInput = `${serverSeed}:${clientSeed}:${nonce}`
    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    
    // Select winners based on hash
    const prizes = template.prizes as any[]
    const winners: any[] = []
    
    for (let i = 0; i < Math.min(prizes.length, tickets.length); i++) {
      const winnerIndex = hashArray[i] % tickets.length
      const winner = tickets[winnerIndex]
      winners.push({
        position: i + 1,
        user_id: winner.user_id,
        ticket_id: winner.id,
        ticket_number: winner.ticket_number,
        prize_bsk: prizes[i].amount || 0
      })
      // Remove selected ticket from pool
      tickets.splice(winnerIndex, 1)
    }

    console.log('Winners selected:', winners)

    // 5. Create draw result
    const { data: result, error: resultError } = await supabase
      .from('draw_results')
      .insert({
        draw_id: drawId,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce,
        ticket_ids_ordered: tickets.map(t => t.id),
        winners: winners,
        proof_data: {
          hash_input: hashInput,
          seed_id: seedData.id
        }
      })
      .select()
      .single()

    if (resultError) {
      console.error('Error creating draw result:', resultError)
      throw new Error('Failed to create draw result')
    }

    // 6. Update winning tickets
    for (const winner of winners) {
      await supabase
        .from('lucky_draw_tickets')
        .update({
          status: 'won',
          prize_amount: winner.prize_bsk
        })
        .eq('id', winner.ticket_id)

      // Credit BSK to winner
      const { data: balance } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance')
        .eq('user_id', winner.user_id)
        .maybeSingle()

      if (balance) {
        await supabase
          .from('user_bsk_balances')
          .update({
            withdrawable_balance: balance.withdrawable_balance + winner.prize_bsk
          })
          .eq('user_id', winner.user_id)
      } else {
        await supabase
          .from('user_bsk_balances')
          .insert({
            user_id: winner.user_id,
            withdrawable_balance: winner.prize_bsk,
            total_earned_withdrawable: winner.prize_bsk
          })
      }

      // Create ledger entry
      await supabase
        .from('bonus_ledger')
        .insert({
          user_id: winner.user_id,
          type: 'lucky_draw_win',
          amount_bsk: winner.prize_bsk,
          meta_json: {
            draw_id: drawId,
            position: winner.position,
            ticket_id: winner.ticket_id
          }
        })
    }

    // 7. Update losing tickets
    const losingTicketIds = tickets.map(t => t.id)
    if (losingTicketIds.length > 0) {
      await supabase
        .from('lucky_draw_tickets')
        .update({ status: 'lost' })
        .in('id', losingTicketIds)
    }

    // 8. Deactivate draw template
    await supabase
      .from('draw_templates')
      .update({ is_active: false })
      .eq('id', drawId)

    console.log('Draw execution completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        draw_id: drawId,
        result_id: result.id,
        winners,
        total_tickets: tickets.length + winners.length,
        message: 'Draw executed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error executing draw:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
