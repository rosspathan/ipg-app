import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commit-reveal RNG implementation
function generateCommitReveal() {
  const randomValue = Math.random().toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(randomValue);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return {
      reveal: randomValue,
      commit: hashHex
    };
  });
}

function verifyCommitReveal(commit: string, reveal: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(reveal);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === commit;
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { config_id, commit_hash, reveal_value } = await req.json();

    if (!config_id) {
      throw new Error('Draw config ID is required');
    }

    console.log(`Executing pool-based lucky draw for config: ${config_id}`);

    // Get the draw configuration
    const { data: drawConfig, error: configError } = await supabase
      .from('lucky_draw_configs')
      .select('*')
      .eq('id', config_id)
      .single();

    if (configError || !drawConfig) {
      throw new Error(`Draw configuration not found: ${configError?.message}`);
    }

    if (drawConfig.status !== 'active') {
      throw new Error('Only active draws can be executed');
    }

    // Check if pool is full
    if (drawConfig.current_participants < drawConfig.pool_size) {
      throw new Error(`Pool not full. Current: ${drawConfig.current_participants}, Required: ${drawConfig.pool_size}`);
    }

    // Handle commit-reveal process
    let finalReveal = reveal_value;
    let finalCommit = commit_hash;
    
    if (!finalCommit || !finalReveal) {
      // Generate new commit-reveal if not provided
      const commitReveal = await generateCommitReveal();
      finalCommit = commitReveal.commit;
      finalReveal = commitReveal.reveal;
      
      // Store commit hash first
      await supabase
        .from('lucky_draw_configs')
        .update({ commit_hash: finalCommit })
        .eq('id', config_id);
    } else {
      // Verify existing commit-reveal
      const isValid = await verifyCommitReveal(finalCommit, finalReveal);
      if (!isValid) {
        throw new Error('Invalid commit-reveal verification');
      }
    }

    // Get all tickets for this draw
    const { data: tickets, error: ticketsError } = await supabase
      .from('lucky_draw_tickets')
      .select('*')
      .eq('config_id', config_id)
      .eq('status', 'pending');

    if (ticketsError) {
      throw new Error(`Failed to get tickets: ${ticketsError.message}`);
    }

    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets found for this draw');
    }

    console.log(`Found ${tickets.length} tickets for pool-based draw execution`);

    // Use commit-reveal for deterministic randomness
    const seed = parseInt(finalReveal.slice(0, 8), 16);
    const seededRandom = (index: number) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    // Shuffle tickets using seeded randomness
    const shuffledTickets = [...tickets]
      .map((ticket, index) => ({ ticket, sort: seededRandom(index) }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.ticket);

    // Select winners (1st, 2nd, 3rd place)
    const maxWinners = Math.min(3, tickets.length); // Always 3 for tiered prizes
    const winningTickets = shuffledTickets.slice(0, maxWinners);

    console.log(`Selecting ${maxWinners} winners with tiered BSK prizes`);

    // Calculate BSK prizes after admin fee deduction
    const totalIPGCollected = drawConfig.current_participants * drawConfig.ticket_price;
    const adminFeeAmount = totalIPGCollected * (drawConfig.admin_fee_percent / 100);
    const netAmount = totalIPGCollected - adminFeeAmount;

    // Prize tiers (preset amounts, not percentage-based)
    const prizes = [
      { tier: 1, bsk_amount: drawConfig.first_place_prize * (100 - drawConfig.admin_fee_percent) / 100 },
      { tier: 2, bsk_amount: drawConfig.second_place_prize * (100 - drawConfig.admin_fee_percent) / 100 },
      { tier: 3, bsk_amount: drawConfig.third_place_prize * (100 - drawConfig.admin_fee_percent) / 100 }
    ];

    // Update winning tickets with tiered prizes
    const results = [];
    for (let i = 0; i < maxWinners && i < prizes.length; i++) {
      const ticket = winningTickets[i];
      const prize = prizes[i];
      
      const { error: updateError } = await supabase
        .from('lucky_draw_tickets')
        .update({
          status: 'won',
          prize_tier: prize.tier,
          bsk_payout: prize.bsk_amount,
          verification_data: {
            commit_hash: finalCommit,
            reveal_value: finalReveal,
            seed: seed,
            position_in_shuffle: i,
            total_participants: tickets.length
          }
        })
        .eq('id', ticket.id);

      if (updateError) {
        console.error(`Failed to update winning ticket ${ticket.id}:`, updateError);
        continue;
      }

      // Grant BSK bonus to winners
      const { error: ledgerError } = await supabase
        .from('bonus_ledger')
        .insert({
          user_id: ticket.user_id,
          amount_bsk: prize.bsk_amount,
          usd_value: prize.bsk_amount, // Assume 1:1 for now
          type: 'lucky_draw_win',
          asset: 'BSK',
          meta_json: {
            draw_id: config_id,
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number,
            prize_tier: prize.tier,
            admin_fee_percent: drawConfig.admin_fee_percent,
            verification: {
              commit_hash: finalCommit,
              reveal_value: finalReveal,
              verified: true
            }
          }
        });

      if (ledgerError) {
        console.error(`Failed to create bonus ledger entry for winner ${ticket.id}:`, ledgerError);
      }

      results.push({
        ticket_number: ticket.ticket_number,
        user_id: ticket.user_id,
        prize_tier: prize.tier,
        bsk_payout: prize.bsk_amount
      });
    }

    // Mark all other tickets as lost
    const losingTickets = tickets.filter(ticket => 
      !winningTickets.some(winner => winner.id === ticket.id)
    );

    for (const loser of losingTickets) {
      const { error: updateError } = await supabase
        .from('lucky_draw_tickets')
        .update({ status: 'lost' })
        .eq('id', loser.id);

      if (updateError) {
        console.error(`Failed to update losing ticket ${loser.id}:`, updateError);
      }
    }

    // Update draw status to completed with execution data
    const { error: statusError } = await supabase
      .from('lucky_draw_configs')
      .update({ 
        status: 'completed',
        executed_at: new Date().toISOString(),
        reveal_value: finalReveal
      })
      .eq('id', config_id);

    if (statusError) {
      console.error('Failed to update draw status:', statusError);
    }

    // Log the draw execution
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: null, // System action
        action: 'execute_lucky_draw',
        resource_type: 'lucky_draw_configs',
        resource_id: config_id,
        new_values: {
          total_tickets: tickets.length,
          winners_count: maxWinners,
          total_ipg_collected: totalIPGCollected,
          admin_fee_amount: adminFeeAmount,
          prizes_awarded: results,
          commit_hash: finalCommit,
          reveal_value: finalReveal,
          execution_time: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Failed to log draw execution:', auditError);
    }

    console.log('Lucky draw execution completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pool-based lucky draw executed successfully',
        results: {
          total_tickets: tickets.length,
          winners_count: maxWinners,
          total_ipg_collected: totalIPGCollected,
          admin_fee_amount: adminFeeAmount,
          net_amount: netAmount,
          winning_tickets: results,
          verification: {
            commit_hash: finalCommit,
            reveal_value: finalReveal,
            seed: seed,
            can_verify: true
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error executing lucky draw:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});