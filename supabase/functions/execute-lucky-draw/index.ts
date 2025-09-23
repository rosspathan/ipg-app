import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { config_id } = await req.json();

    if (!config_id) {
      throw new Error('Draw config ID is required');
    }

    console.log(`Executing lucky draw for config: ${config_id}`);

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

    console.log(`Found ${tickets.length} tickets for draw execution`);

    // Shuffle tickets for random selection
    const shuffledTickets = [...tickets].sort(() => Math.random() - 0.5);
    const maxWinners = Math.min(drawConfig.max_winners, tickets.length);
    const winningTickets = shuffledTickets.slice(0, maxWinners);
    const prizePerWinner = drawConfig.prize_pool / maxWinners;

    console.log(`Selecting ${maxWinners} winners with ${prizePerWinner} USDT each`);

    // Update winning tickets
    const winnerUpdates = winningTickets.map(ticket => ({
      id: ticket.id,
      status: 'won',
      prize_amount: prizePerWinner
    }));

    // Update all winning tickets
    for (const winner of winnerUpdates) {
      const { error: updateError } = await supabase
        .from('lucky_draw_tickets')
        .update({
          status: winner.status,
          prize_amount: winner.prize_amount
        })
        .eq('id', winner.id);

      if (updateError) {
        console.error(`Failed to update winning ticket ${winner.id}:`, updateError);
      }

      // Grant BSK bonus to winners (convert USDT prize to BSK)
      const bskAmount = winner.prize_amount; // 1:1 conversion for simplicity
      
      const { error: ledgerError } = await supabase
        .from('bonus_ledger')
        .insert({
          user_id: tickets.find(t => t.id === winner.id)?.user_id,
          amount_bsk: bskAmount,
          usd_value: winner.prize_amount,
          type: 'lucky_draw_win',
          asset: 'BSK',
          meta_json: {
            draw_id: config_id,
            ticket_id: winner.id,
            ticket_number: tickets.find(t => t.id === winner.id)?.ticket_number
          }
        });

      if (ledgerError) {
        console.error(`Failed to create bonus ledger entry for winner ${winner.id}:`, ledgerError);
      }
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

    // Update draw status to completed
    const { error: statusError } = await supabase
      .from('lucky_draw_configs')
      .update({ status: 'completed' })
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
          prize_per_winner: prizePerWinner,
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
        message: 'Lucky draw executed successfully',
        results: {
          total_tickets: tickets.length,
          winners_count: maxWinners,
          prize_per_winner: prizePerWinner,
          winning_tickets: winningTickets.map(t => ({
            ticket_number: t.ticket_number,
            user_id: t.user_id,
            prize_amount: prizePerWinner
          }))
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