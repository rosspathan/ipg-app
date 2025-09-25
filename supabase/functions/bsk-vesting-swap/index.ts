import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { 
      ipg_amount, 
      bsk_exchange_rate, 
      chain = 'BEP20', 
      tx_hash 
    } = await req.json();

    console.log('Processing BSK vesting swap:', { 
      user_id: user.id, 
      ipg_amount, 
      bsk_exchange_rate, 
      chain 
    });

    // Get active vesting configuration
    const { data: config, error: configError } = await supabaseClient
      .from('bsk_vesting_config')
      .select('*')
      .eq('is_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('No active vesting config:', configError);
      return new Response(
        JSON.stringify({ error: 'BSK vesting is currently disabled' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate chain eligibility
    if (!config.eligible_chains.includes(chain)) {
      return new Response(
        JSON.stringify({ error: `Chain ${chain} is not eligible for BSK vesting` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate amount limits
    if (ipg_amount < config.min_ipg_swap_amount) {
      return new Response(
        JSON.stringify({ 
          error: `Minimum IPG amount is ${config.min_ipg_swap_amount}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (config.max_ipg_swap_amount && ipg_amount > config.max_ipg_swap_amount) {
      return new Response(
        JSON.stringify({ 
          error: `Maximum IPG amount is ${config.max_ipg_swap_amount}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check existing vesting schedules for user
    if (config.max_vesting_per_user) {
      const { data: existingVesting, error: vestingCheckError } = await supabaseClient
        .from('user_bsk_vesting')
        .select('bsk_total_amount')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (vestingCheckError) {
        console.error('Error checking existing vesting:', vestingCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to validate vesting limits' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const totalExisting = existingVesting.reduce((sum, v) => sum + Number(v.bsk_total_amount), 0);
      const bskTotalAmount = ipg_amount * bsk_exchange_rate;
      
      if (totalExisting + bskTotalAmount > config.max_vesting_per_user) {
        return new Response(
          JSON.stringify({ 
            error: `Would exceed maximum vesting limit of ${config.max_vesting_per_user} BSK per user` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Calculate vesting parameters
    const bskTotalAmount = ipg_amount * bsk_exchange_rate;
    const bskDailyAmount = (bskTotalAmount * config.daily_release_percent) / 100;
    const startDate = new Date().toISOString().split('T')[0]; // Today's date as YYYY-MM-DD
    const endDate = new Date(Date.now() + config.vesting_duration_days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    // Create vesting schedule
    const { data: vesting, error: vestingError } = await supabaseClient
      .from('user_bsk_vesting')
      .insert({
        user_id: user.id,
        config_id: config.id,
        ipg_amount_swapped: ipg_amount,
        bsk_total_amount: bskTotalAmount,
        bsk_daily_amount: bskDailyAmount,
        bsk_pending_total: bskTotalAmount,
        start_date: startDate,
        end_date: endDate,
        swap_tx_hash: tx_hash,
        swap_chain: chain
      })
      .select()
      .single();

    if (vestingError) {
      console.error('Failed to create vesting schedule:', vestingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create vesting schedule' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('BSK vesting schedule created:', vesting.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        vesting_schedule: vesting,
        message: 'BSK vesting schedule created successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in bsk-vesting-swap:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});