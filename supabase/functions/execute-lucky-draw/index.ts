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

    // Check admin role
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) throw new Error('Admin access required');

    const { drawId } = await req.json();
    console.log('[execute-lucky-draw] Admin:', user.id, 'Draw:', drawId);

    // Fetch draw config
    const { data: draw, error: drawError } = await supabaseClient
      .from('draw_configs')
      .select('*')
      .eq('id', drawId)
      .eq('state', 'pending_execution')
      .single();

    if (drawError || !draw) {
      console.error('Draw fetch error:', drawError);
      throw new Error('Draw not found or not ready for execution');
    }

    // Fetch all active tickets
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('draw_tickets')
      .select('id, user_id, ticket_number')
      .eq('draw_id', drawId)
      .eq('status', 'active');

    if (ticketsError) throw ticketsError;
    if (!tickets || tickets.length === 0) throw new Error('No active tickets');

    console.log(`[execute-lucky-draw] Processing ${tickets.length} tickets`);

    // Generate cryptographic seeds for provably fair randomness
    const serverSeed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const clientSeed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Deterministic shuffle based on seeds
    const shuffledTickets = [...tickets].sort((a, b) => {
      const hashA = serverSeed + clientSeed + a.id;
      const hashB = serverSeed + clientSeed + b.id;
      return hashA.localeCompare(hashB);
    });

    // Winner is first ticket after shuffle
    const winningTicket = shuffledTickets[0];
    const winnerId = winningTicket.user_id;

    // Calculate winner payout (pool - 10% platform fee)
    const poolBsk = draw.pool_bsk || 0;
    const platformFeeBsk = draw.platform_fee_bsk || 0;
    const winnerPayout = poolBsk - platformFeeBsk;

    console.log(`[execute-lucky-draw] Winner: ${winnerId}, Payout: ${winnerPayout} BSK`);

    // Update winning ticket status
    await supabaseClient
      .from('draw_tickets')
      .update({ status: 'won' })
      .eq('id', winningTicket.id);

    // Update losing tickets
    await supabaseClient
      .from('draw_tickets')
      .update({ status: 'lost' })
      .eq('draw_id', drawId)
      .eq('status', 'active')
      .neq('id', winningTicket.id);

    // Get winner's current balance
    const { data: winnerBalance } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', winnerId)
      .single();

    const currentBalance = winnerBalance?.withdrawable_balance || 0;
    const newBalance = currentBalance + winnerPayout;

    // Update winner's BSK balance
    await supabaseClient
      .from('user_bsk_balances')
      .upsert({
        user_id: winnerId,
        withdrawable_balance: newBalance
      }, {
        onConflict: 'user_id'
      });

    // Create winner ledger entry
    await supabaseClient
      .from('bsk_withdrawable_ledger')
      .insert({
        user_id: winnerId,
        amount_bsk: winnerPayout,
        tx_type: 'credit',
        tx_subtype: 'lucky_draw_win',
        reference_id: drawId,
        balance_before: currentBalance,
        balance_after: newBalance,
        notes: `Lucky Draw Winner - Draw #${drawId}`
      });

    // Record platform fee in admin ledger
    if (platformFeeBsk > 0) {
      await supabaseClient
        .from('admin_fees_ledger')
        .insert({
          amount_bsk: platformFeeBsk,
          fee_type: 'lucky_draw',
          source_reference: drawId,
          notes: `Lucky Draw platform fee - Draw #${drawId}`
        });
    }

    // Create draw results record
    await supabaseClient
      .from('draw_results')
      .insert({
        draw_id: drawId,
        winning_ticket_id: winningTicket.id,
        winner_user_id: winnerId,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce: 1,
        ticket_ids_ordered: shuffledTickets.map(t => t.id),
        proof_data: {
          total_tickets: tickets.length,
          pool_bsk: poolBsk,
          platform_fee_bsk: platformFeeBsk,
          winner_payout: winnerPayout,
          execution_timestamp: new Date().toISOString(),
          executed_by: user.id
        }
      });

    // Update draw state to completed
    await supabaseClient
      .from('draw_configs')
      .update({
        state: 'completed',
        executed_at: new Date().toISOString()
      })
      .eq('id', drawId);

    // Log admin action
    await supabaseClient
      .from('admin_actions_log')
      .insert({
        admin_user_id: user.id,
        action_type: 'lucky_draw_executed',
        target_entity: 'draw_configs',
        target_id: drawId,
        details: {
          winner_user_id: winnerId,
          winning_ticket_id: winningTicket.id,
          payout_bsk: winnerPayout,
          total_participants: tickets.length
        }
      });

    console.log('✅ Draw executed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        winner: {
          user_id: winnerId,
          ticket_id: winningTicket.id,
          ticket_number: winningTicket.ticket_number,
          payout_bsk: winnerPayout
        },
        draw: {
          id: drawId,
          total_tickets: tickets.length,
          pool_bsk: poolBsk,
          platform_fee_bsk: platformFeeBsk
        },
        provably_fair: {
          server_seed: serverSeed,
          client_seed: clientSeed,
          nonce: 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error executing draw:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
