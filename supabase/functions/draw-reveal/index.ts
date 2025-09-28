import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevealRequest {
  draw_id: string;
}

// Fisher-Yates shuffle using deterministic PRNG
function fisherYatesShuffle(array: string[], seed: string): string[] {
  const shuffled = [...array];
  let seedNum = parseInt(seed.slice(0, 8), 16);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Linear congruential generator for deterministic randomness
    seedNum = (seedNum * 1664525 + 1013904223) % Math.pow(2, 32);
    const j = seedNum % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { draw_id } = await req.json() as RevealRequest;

    if (!draw_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎁 Revealing draw ${draw_id}`);

    // Get draw config with commitment data
    const { data: drawConfig, error: drawError } = await supabase
      .from('draw_configs')
      .select('*')
      .eq('id', draw_id)
      .single();

    if (drawError || !drawConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (drawConfig.state !== 'drawing') {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw is not in drawing state' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all tickets for this draw
    const { data: tickets, error: ticketsError } = await supabase
      .from('draw_tickets')
      .select('*')
      .eq('draw_id', draw_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (ticketsError || !tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid tickets found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get prize configuration
    const { data: prizes, error: prizesError } = await supabase
      .from('draw_prizes')
      .select('*')
      .eq('draw_id', draw_id)
      .order('amount_inr', { ascending: false });

    if (prizesError || !prizes || prizes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No prizes configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current BSK rate
    const { data: bskRate } = await supabase.rpc('get_current_bsk_rate');
    const currentRate = bskRate || 1.0;

    // Create deterministic randomness using Web Crypto API HMAC
    const combinedSeed = `${drawConfig.server_seed}:${drawConfig.client_seed}:${drawConfig.nonce}`;
    
    // Import key for HMAC
    const keyData = new TextEncoder().encode(drawConfig.server_seed);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Create HMAC
    const signData = new TextEncoder().encode(combinedSeed);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, signData);
    const randomValue = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Use Fisher-Yates shuffle to determine winners
    const ticketIds = tickets.map(t => t.id);
    const shuffledTickets = fisherYatesShuffle(ticketIds, randomValue);
    
    // Select winners (first N tickets from shuffled array)
    const numberOfPrizes = Math.min(prizes.length, shuffledTickets.length);
    const winners = [];

    console.log(`🏆 Selecting ${numberOfPrizes} winners from ${tickets.length} tickets`);

    for (let i = 0; i < numberOfPrizes; i++) {
      const winnerTicketId = shuffledTickets[i];
      const winnerTicket = tickets.find(t => t.id === winnerTicketId);
      const prize = prizes[i];
      
      if (!winnerTicket || !prize) continue;

      // Calculate prize amounts
      const prizeBskGross = prize.amount_inr / currentRate;
      const feeBsk = prizeBskGross * (drawConfig.fee_percent / 100);
      const prizeBskNet = prizeBskGross - feeBsk;

      winners.push({
        ticket_id: winnerTicket.id,
        user_id: winnerTicket.user_id,
        rank: prize.rank,
        prize_inr: prize.amount_inr,
        prize_bsk_gross: prizeBskGross,
        prize_bsk_net: prizeBskNet,
        fee_bsk: feeBsk,
        bsk_rate_snapshot: currentRate
      });

      // Update ticket with winning information
      await supabase
        .from('draw_tickets')
        .update({
          status: 'won',
          prize_rank: prize.rank,
          prize_bsk_gross: prizeBskGross,
          prize_bsk_net: prizeBskNet,
          fee_bsk: feeBsk
        })
        .eq('id', winnerTicket.id);

      // Credit winner's BSK balance
      await supabase
        .from('bsk_withdrawable_ledger')
        .insert({
          user_id: winnerTicket.user_id,
          draw_id: draw_id,
          ticket_id: winnerTicket.id,
          amount_bsk: prizeBskNet,
          amount_inr: prize.amount_inr,
          bsk_rate_snapshot: currentRate,
          transaction_type: 'draw_prize_net',
          metadata: {
            rank: prize.rank,
            gross_bsk: prizeBskGross,
            fee_bsk: feeBsk,
            fee_percent: drawConfig.fee_percent
          }
        });

      // Credit admin fee
      await supabase
        .from('admin_fees_ledger')
        .insert({
          user_id: winnerTicket.user_id,
          draw_id: draw_id,
          fee_bsk: feeBsk,
          fee_inr: feeBsk * currentRate,
          source_type: 'draw_fee',
          bsk_rate_snapshot: currentRate,
          metadata: {
            ticket_id: winnerTicket.id,
            rank: prize.rank,
            gross_prize_bsk: prizeBskGross
          }
        });

      console.log(`🎉 Winner: ${winnerTicket.user_id} - ${prize.rank} place - ${prizeBskNet.toFixed(2)} BSK net`);
    }

    // Create draw results record
    const proofData = {
      server_seed: drawConfig.server_seed,
      server_seed_hash: drawConfig.server_seed_hash,
      client_seed: drawConfig.client_seed,
      nonce: drawConfig.nonce,
      combined_seed: combinedSeed,
      random_value: randomValue,
      shuffle_result: shuffledTickets,
      bsk_rate_snapshot: currentRate,
      total_tickets: tickets.length,
      algorithm: 'HMAC-SHA256 + Fisher-Yates Shuffle'
    };

    await supabase
      .from('draw_results')
      .insert({
        draw_id: draw_id,
        server_seed: drawConfig.server_seed,
        client_seed: drawConfig.client_seed,
        nonce: drawConfig.nonce,
        ticket_ids_ordered: shuffledTickets,
        winners: winners,
        proof_data: proofData
      });

    // Update draw state to completed
    await supabase
      .from('draw_configs')
      .update({
        state: 'completed',
        winners_determined_at: new Date().toISOString()
      })
      .eq('id', draw_id);

    console.log(`✅ Draw ${draw_id} completed with ${winners.length} winners`);

    return new Response(
      JSON.stringify({
        success: true,
        draw_id,
        winners_count: winners.length,
        winners,
        proof_data: proofData,
        message: 'Draw completed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Draw reveal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Draw reveal failed', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});