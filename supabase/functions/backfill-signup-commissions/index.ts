import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  dry_run?: boolean;
  user_ids?: string[]; // Optional: backfill specific users
}

interface BackfillResult {
  user_id: string;
  email: string;
  sponsor_id: string;
  locked_at: string;
  commissions_paid: number;
  total_bsk: number;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
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

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      throw new Error('Admin access required');
    }

    const { dry_run = true, user_ids } = await req.json() as BackfillRequest;

    console.log(`Starting backfill - Dry run: ${dry_run}, Specific users: ${user_ids?.length || 'all'}`);

    // Find users who need backfilling
    let query = supabase
      .from('referral_links_new')
      .select(`
        user_id,
        sponsor_id,
        locked_at,
        users:auth.users!referral_links_new_user_id_fkey(email)
      `)
      .not('sponsor_id', 'is', null)
      .not('locked_at', 'is', null);

    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: referralLinks, error: linkError } = await query;

    if (linkError) {
      throw new Error(`Failed to fetch referral links: ${linkError.message}`);
    }

    console.log(`Found ${referralLinks?.length || 0} users with locked sponsors`);

    // Check which users already have signup commissions
    const userIdsToCheck = referralLinks?.map(r => r.user_id) || [];
    const { data: existingCommissions } = await supabase
      .from('referral_commissions')
      .select('payer_id')
      .in('payer_id', userIdsToCheck)
      .eq('event_type', 'signup');

    const usersWithCommissions = new Set(
      existingCommissions?.map(c => c.payer_id) || []
    );

    console.log(`${usersWithCommissions.size} users already have signup commissions`);

    // Process each user
    const results: BackfillResult[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let totalBskToDistribute = 0;

    for (const link of referralLinks || []) {
      const userEmail = link.users?.email || 'unknown';
      
      // Skip if already has commissions
      if (usersWithCommissions.has(link.user_id)) {
        results.push({
          user_id: link.user_id,
          email: userEmail,
          sponsor_id: link.sponsor_id,
          locked_at: link.locked_at,
          commissions_paid: 0,
          total_bsk: 0,
          status: 'skipped',
          reason: 'Already has signup commissions'
        });
        skippedCount++;
        continue;
      }

      // Check if referral tree exists
      const { data: treeRecords } = await supabase
        .from('referral_tree')
        .select('level')
        .eq('user_id', link.user_id);

      if (!treeRecords || treeRecords.length === 0) {
        results.push({
          user_id: link.user_id,
          email: userEmail,
          sponsor_id: link.sponsor_id,
          locked_at: link.locked_at,
          commissions_paid: 0,
          total_bsk: 0,
          status: 'failed',
          reason: 'No referral tree found - run V2 Rebuild first'
        });
        failedCount++;
        continue;
      }

      // In dry run mode, just simulate
      if (dry_run) {
        // Estimate commissions
        const { data: rewards } = await supabase
          .from('referral_level_rewards')
          .select('level, bsk_amount')
          .lte('level', treeRecords.length)
          .eq('is_active', true);

        const estimatedTotal = rewards?.reduce((sum, r) => sum + Number(r.bsk_amount), 0) || 0;

        results.push({
          user_id: link.user_id,
          email: userEmail,
          sponsor_id: link.sponsor_id,
          locked_at: link.locked_at,
          commissions_paid: rewards?.length || 0,
          total_bsk: estimatedTotal,
          status: 'success',
          reason: 'DRY RUN - would distribute commissions'
        });
        totalBskToDistribute += estimatedTotal;
        processedCount++;
      } else {
        // Actually call the commission processor
        try {
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-signup-commissions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ user_id: link.user_id })
            }
          );

          const result = await response.json();

          if (result.success) {
            results.push({
              user_id: link.user_id,
              email: userEmail,
              sponsor_id: link.sponsor_id,
              locked_at: link.locked_at,
              commissions_paid: result.recipients_count || 0,
              total_bsk: result.total_paid || 0,
              status: 'success'
            });
            totalBskToDistribute += result.total_paid || 0;
            processedCount++;
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        } catch (error) {
          results.push({
            user_id: link.user_id,
            email: userEmail,
            sponsor_id: link.sponsor_id,
            locked_at: link.locked_at,
            commissions_paid: 0,
            total_bsk: 0,
            status: 'failed',
            reason: error.message
          });
          failedCount++;
        }
      }
    }

    const summary = {
      dry_run,
      total_users_checked: referralLinks?.length || 0,
      processed: processedCount,
      skipped: skippedCount,
      failed: failedCount,
      total_bsk_distributed: totalBskToDistribute,
      results
    };

    console.log('Backfill summary:', {
      dry_run,
      processed: processedCount,
      skipped: skippedCount,
      failed: failedCount,
      total_bsk: totalBskToDistribute
    });

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backfill:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
