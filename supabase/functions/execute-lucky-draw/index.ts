import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { drawId } = await req.json();
    console.log('[execute-lucky-draw] Admin:', user.id, 'Draw:', drawId);

    const { data: draw, error: drawError } = await supabaseClient
      .from('draw_templates')
      .select('*')
      .eq('id', drawId)
      .eq('is_active', true)
      .single();

    if (drawError || !draw) throw new Error('Draw not found');

    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('draw_tickets')
      .select('*')
      .eq('draw_id', drawId)
      .eq('status', 'active');

    if (ticketsError) throw ticketsError;
    if (!tickets || tickets.length === 0) throw new Error('No tickets purchased');

    const serverSeed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const clientSeed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const shuffledTickets = [...tickets].sort((a, b) => {
      const hashA = serverSeed + clientSeed + a.id;
      const hashB = serverSeed + clientSeed + b.id;
      return hashA.localeCompare(hashB);
    });

    const winners = [];
    const prizes = draw.prizes || { '1st': 0, '2nd': 0, '3rd': 0 };
    
    if (shuffledTickets.length > 0) {
      winners.push({
        ticket_id: shuffledTickets[0].id,
        user_id: shuffledTickets[0].user_id,
        rank: 'first',
        prize_bsk: prizes['1st'] || 0
      });
    }
    
    if (shuffledTickets.length > 1) {
      winners.push({
        ticket_id: shuffledTickets[1].id,
        user_id: shuffledTickets[1].user_id,
        rank: 'second',
        prize_bsk: prizes['2nd'] || 0
      });
    }
    
    if (shuffledTickets.length > 2) {
      winners.push({
        ticket_id: shuffledTickets[2].id,
        user_id: shuffledTickets[2].user_id,
        rank: 'third',
        prize_bsk: prizes['3rd'] || 0
      });
    }

    for (const winner of winners) {
      await supabaseClient.from('draw_tickets').update({ status: 'won' }).eq('id', winner.ticket_id);

      const { data: winnerBalance } = await supabaseClient
        .from('user_bsk_balances')
        .select('withdrawable_balance')
        .eq('user_id', winner.user_id)
        .single();

      const currentBalance = winnerBalance?.withdrawable_balance || 0;

      await supabaseClient.from('user_bsk_balances').update({
        withdrawable_balance: currentBalance + winner.prize_bsk
      }).eq('user_id', winner.user_id);

      await supabaseClient.from('bsk_withdrawable_ledger').insert({
        user_id: winner.user_id,
        amount_bsk: winner.prize_bsk,
        tx_type: 'credit',
        tx_subtype: 'lucky_draw_win',
        reference_id: drawId,
        balance_before: currentBalance,
        balance_after: currentBalance + winner.prize_bsk,
        notes: `Won ${winner.rank} prize in lucky draw`
      });
    }

    const winningTicketIds = winners.map(w => w.ticket_id);
    await supabaseClient
      .from('draw_tickets')
      .update({ status: 'lost' })
      .eq('draw_id', drawId)
      .eq('status', 'active')
      .not('id', 'in', `(${winningTicketIds.join(',')})`);

    await supabaseClient.from('draw_results').insert({
      draw_id: drawId,
      server_seed: serverSeed,
      client_seed: clientSeed,
      nonce: 1,
      ticket_ids_ordered: shuffledTickets.map(t => t.id),
      winners: winners,
      proof_data: { total_tickets: tickets.length, timestamp: new Date().toISOString() }
    });

    await supabaseClient.from('draw_templates').update({ is_active: false }).eq('id', drawId);

    console.log('✅ Draw executed successfully');

    return new Response(
      JSON.stringify({ success: true, winners, total_tickets: tickets.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
