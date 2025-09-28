import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseRequest {
  draw_id: string;
  ticket_count: number;
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

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Set the auth token for user context
    const token = authHeader.replace('Bearer ', '');
    supabase.auth.setSession({ access_token: token, refresh_token: '' });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { draw_id, ticket_count = 1 } = await req.json() as PurchaseRequest;

    if (!draw_id || ticket_count < 1 || ticket_count > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎫 User ${user.id} purchasing ${ticket_count} ticket(s) for draw ${draw_id}`);

    // Get draw configuration
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

    if (drawConfig.state !== 'open') {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw is not open for ticket purchases' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if pool has space
    const spacesRemaining = drawConfig.pool_size - drawConfig.current_participants;
    if (spacesRemaining < ticket_count) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Not enough spaces. Only ${spacesRemaining} spaces remaining.` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check per-user ticket cap
    const { data: existingTickets } = await supabase
      .from('draw_tickets')
      .select('id')
      .eq('draw_id', draw_id)
      .eq('user_id', user.id);

    const currentUserTickets = existingTickets?.length || 0;
    if (currentUserTickets + ticket_count > drawConfig.per_user_ticket_cap) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Exceeds per-user limit of ${drawConfig.per_user_ticket_cap} tickets. You have ${currentUserTickets}.` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current BSK rate
    const { data: bskRate } = await supabase.rpc('get_current_bsk_rate');
    const currentRate = bskRate || 1.0;

    // Calculate costs
    const totalInr = drawConfig.ticket_price_inr * ticket_count;
    const totalBsk = totalInr / currentRate;

    // Check user's BSK withdrawable balance
    const { data: userBalance } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    const availableBalance = userBalance?.withdrawable_balance || 0;
    if (availableBalance < totalBsk) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient BSK balance. Required: ${totalBsk.toFixed(2)}, Available: ${availableBalance.toFixed(2)}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create tickets
    const tickets = [];
    const configSnapshot = {
      title: drawConfig.title,
      ticket_price_inr: drawConfig.ticket_price_inr,
      fee_percent: drawConfig.fee_percent,
      pool_size: drawConfig.pool_size,
      per_user_ticket_cap: drawConfig.per_user_ticket_cap
    };

    for (let i = 0; i < ticket_count; i++) {
      const ticketNumber = `BSK-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      
      const { data: ticket, error: ticketError } = await supabase
        .from('draw_tickets')
        .insert({
          draw_id: draw_id,
          user_id: user.id,
          ticket_number: ticketNumber,
          bsk_paid: totalBsk / ticket_count,
          inr_amount: drawConfig.ticket_price_inr,
          bsk_rate_snapshot: currentRate,
          config_snapshot: configSnapshot
        })
        .select()
        .single();

      if (ticketError) {
        throw ticketError;
      }

      tickets.push(ticket);

      // Record the BSK debit in ledger
      await supabase
        .from('bsk_withdrawable_ledger')
        .insert({
          user_id: user.id,
          draw_id: draw_id,
          ticket_id: ticket.id,
          amount_bsk: -(totalBsk / ticket_count), // Negative for debit
          amount_inr: drawConfig.ticket_price_inr,
          bsk_rate_snapshot: currentRate,
          transaction_type: 'draw_ticket',
          metadata: {
            ticket_number: ticketNumber,
            draw_title: drawConfig.title
          }
        });
    }

    // Debit user's BSK balance
    await supabase
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: availableBalance - totalBsk
      })
      .eq('user_id', user.id);

    // Update draw participant count
    const newParticipantCount = drawConfig.current_participants + ticket_count;
    await supabase
      .from('draw_configs')
      .update({
        current_participants: newParticipantCount,
        // Auto-transition to full if we've reached capacity
        state: newParticipantCount >= drawConfig.pool_size ? 'full' : 'open'
      })
      .eq('id', draw_id);

    // If draw is now full and auto-execute is enabled, trigger commitment
    if (newParticipantCount >= drawConfig.pool_size && drawConfig.start_mode === 'auto_when_full') {
      console.log(`🚀 Draw ${draw_id} is full, triggering auto-execution`);
      
      // Call draw-commit function
      try {
        await supabase.functions.invoke('draw-commit', {
          body: { draw_id }
        });
        
        // Then call draw-reveal function
        setTimeout(() => {
          supabase.functions.invoke('draw-reveal', {
            body: { draw_id }
          });
        }, 1000); // Small delay to ensure commit completes
      } catch (autoExecError) {
        console.error('Auto-execution failed:', autoExecError);
      }
    }

    console.log(`✅ Created ${tickets.length} tickets for user ${user.id}, total cost: ${totalBsk.toFixed(2)} BSK`);

    return new Response(
      JSON.stringify({
        success: true,
        tickets_created: tickets.length,
        total_bsk_cost: totalBsk,
        total_inr_cost: totalInr,
        bsk_rate_snapshot: currentRate,
        draw_state: newParticipantCount >= drawConfig.pool_size ? 'full' : 'open',
        spaces_remaining: Math.max(0, drawConfig.pool_size - newParticipantCount),
        tickets: tickets.map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          created_at: t.created_at
        })),
        message: 'Tickets purchased successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Ticket purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Ticket purchase failed', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});