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

    console.log('Starting daily BSK vesting process...');

    // Call the database function to process daily vesting
    const { data: result, error } = await supabaseClient
      .rpc('process_daily_bsk_vesting');

    if (error) {
      console.error('Failed to process daily vesting:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process daily vesting',
          details: error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Daily vesting process completed:', result);

    // Update user bonus balances with released BSK amounts
    if (result.success && result.processed_count > 0) {
      console.log('Updating user bonus balances...');
      
      // Get all releases from today's batch
      const { data: releases, error: releasesError } = await supabaseClient
        .from('bsk_vesting_releases')
        .select('user_id, bsk_amount, referrer_id, referrer_reward_amount')
        .eq('batch_id', result.batch_id);

      if (releasesError) {
        console.error('Failed to fetch releases:', releasesError);
      } else {
        // Group releases by user_id
        const userReleases = releases.reduce((acc: any, release: any) => {
          if (!acc[release.user_id]) {
            acc[release.user_id] = 0;
          }
          acc[release.user_id] += Number(release.bsk_amount);
          return acc;
        }, {});

        // Update each user's BSK balance
        for (const [userId, amount] of Object.entries(userReleases)) {
          await supabaseClient
            .from('user_bonus_balances')
            .upsert({
              user_id: userId,
              bsk_available: amount
            }, {
              onConflict: 'user_id'
            });
        }

        // Process referrer rewards
        const referrerRewards = releases
          .filter((r: any) => r.referrer_id && r.referrer_reward_amount > 0)
          .reduce((acc: any, release: any) => {
            if (!acc[release.referrer_id]) {
              acc[release.referrer_id] = 0;
            }
            acc[release.referrer_id] += Number(release.referrer_reward_amount);
            return acc;
          }, {});

        // Update referrer BSK balances
        for (const [referrerId, rewardAmount] of Object.entries(referrerRewards)) {
          await supabaseClient
            .from('user_bonus_balances')
            .upsert({
              user_id: referrerId,
              bsk_available: rewardAmount
            }, {
              onConflict: 'user_id'
            });
        }

        console.log(`Updated balances for ${Object.keys(userReleases).length} users and ${Object.keys(referrerRewards).length} referrers`);
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in bsk-daily-vesting:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});