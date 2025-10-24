import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dryRun = false, batchSize = 50 } = await req.json().catch(() => ({}));
    const batchId = crypto.randomUUID();
    
    console.log(`🔄 Processing retroactive rewards (Dry Run: ${dryRun}, Batch: ${batchId})`);

    // Get all badge purchases
    const { data: purchases, error: purchaseError } = await supabaseClient
      .from('badge_purchases')
      .select('id, user_id, badge_name, inr_amount, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (purchaseError) {
      console.error('Error fetching purchases:', purchaseError);
      throw purchaseError;
    }

    const stats = {
      totalPurchases: purchases?.length || 0,
      teamIncomeProcessed: 0,
      teamIncomeSkipped: 0,
      vipMilestonesProcessed: 0,
      vipMilestonesSkipped: 0,
      totalBSKDistributed: 0,
      errors: [] as any[],
    };

    // Process each purchase
    for (const purchase of purchases || []) {
      try {
        // Check if 50-level team income was already distributed
        const { data: existingTeamIncome } = await supabaseClient
          .from('referral_commissions')
          .select('id')
          .eq('payer_id', purchase.user_id)
          .eq('commission_type', 'team_income')
          .eq('event_type', `badge_purchase:${purchase.id}`)
          .limit(1);

        // Process 50-level team income if not already done
        if (!existingTeamIncome || existingTeamIncome.length === 0) {
          if (!dryRun) {
            const { data: teamIncomeResult, error: teamIncomeError } = await supabaseClient.functions.invoke(
              'process-team-income-rewards',
              {
                body: {
                  payer_id: purchase.user_id,
                  event_type: `badge_purchase:${purchase.id}`,
                  event_id: purchase.id,
                  badge_name: purchase.badge_name,
                  payment_amount: Number(purchase.inr_amount),
                },
              }
            );

            if (teamIncomeError) {
              console.error(`Error processing team income for ${purchase.id}:`, teamIncomeError);
              stats.errors.push({ purchase_id: purchase.id, type: 'team_income', error: teamIncomeError });
              
              // Log failure
              await supabaseClient.from('retroactive_processing_log').insert({
                batch_id: batchId,
                purchase_id: purchase.id,
                processing_type: 'team_income',
                status: 'failed',
                error_message: JSON.stringify(teamIncomeError),
              });
            } else {
              stats.totalBSKDistributed += teamIncomeResult?.total_distributed || 0;
              
              // Log success
              await supabaseClient.from('retroactive_processing_log').insert({
                batch_id: batchId,
                purchase_id: purchase.id,
                processing_type: 'team_income',
                commissions_created: teamIncomeResult?.levels_paid || 0,
                bsk_distributed: teamIncomeResult?.total_distributed || 0,
                status: 'success',
              });
            }
          }
          stats.teamIncomeProcessed++;
        } else {
          stats.teamIncomeSkipped++;
          
          // Log skipped
          if (!dryRun) {
            await supabaseClient.from('retroactive_processing_log').insert({
              batch_id: batchId,
              purchase_id: purchase.id,
              processing_type: 'team_income',
              status: 'skipped',
            });
          }
        }

        // Process VIP milestones for i-Smart VIP purchases
        if (purchase.badge_name === 'i-Smart VIP') {
          const { data: existingMilestone } = await supabaseClient
            .from('user_vip_milestone_claims')
            .select('id')
            .eq('user_id', purchase.user_id)
            .limit(1);

          // Only process if no milestone claims exist yet
          if (!existingMilestone || existingMilestone.length === 0) {
            if (!dryRun) {
              const { data: milestoneResult, error: milestoneError } = await supabaseClient.functions.invoke(
                'process-vip-milestone-rewards',
                {
                  body: {
                    new_vip_user_id: purchase.user_id,
                    event_type: `badge_purchase:${purchase.id}`,
                    event_id: purchase.id,
                  },
                }
              );

              if (milestoneError) {
                console.error(`Error processing VIP milestone for ${purchase.id}:`, milestoneError);
                stats.errors.push({ purchase_id: purchase.id, type: 'vip_milestone', error: milestoneError });
                
                await supabaseClient.from('retroactive_processing_log').insert({
                  batch_id: batchId,
                  purchase_id: purchase.id,
                  processing_type: 'vip_milestone',
                  status: 'failed',
                  error_message: JSON.stringify(milestoneError),
                });
              } else {
                stats.totalBSKDistributed += milestoneResult?.total_bsk_distributed || 0;
                
                await supabaseClient.from('retroactive_processing_log').insert({
                  batch_id: batchId,
                  purchase_id: purchase.id,
                  processing_type: 'vip_milestone',
                  commissions_created: milestoneResult?.milestones_awarded || 0,
                  bsk_distributed: milestoneResult?.total_bsk_distributed || 0,
                  status: 'success',
                });
              }
            }
            stats.vipMilestonesProcessed++;
          } else {
            stats.vipMilestonesSkipped++;
            
            if (!dryRun) {
              await supabaseClient.from('retroactive_processing_log').insert({
                batch_id: batchId,
                purchase_id: purchase.id,
                processing_type: 'vip_milestone',
                status: 'skipped',
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing purchase ${purchase.id}:`, error);
        stats.errors.push({ purchase_id: purchase.id, error: String(error) });
      }
    }

    console.log('✅ Retroactive processing complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        batchId,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Retroactive processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
