import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepairResult {
  user_id: string;
  action: 'created' | 'locked' | 'skipped' | 'failed';
  details?: string;
  error?: string;
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('🔧 Starting comprehensive referral system repair...');

    // Step 1: Get all users from profiles
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, referral_code, created_at');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`📊 Found ${allUsers?.length || 0} total users`);

    const results: RepairResult[] = [];
    let createdCount = 0;
    let lockedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Step 2: Process each user
    for (const profile of allUsers || []) {
      try {
        // Check if user has a referral_links_new record
        const { data: existingLink, error: linkError } = await supabase
          .from('referral_links_new')
          .select('*')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (linkError && linkError.code !== 'PGRST116') {
          throw new Error(`Error checking link: ${linkError.message}`);
        }

        // Case 1: No record exists - create one
        if (!existingLink) {
          const { error: insertError } = await supabase
            .from('referral_links_new')
            .insert({
              user_id: profile.user_id,
              sponsor_id: null,
              sponsor_code_used: null,
              locked_at: null,
              capture_stage: null
            });

          if (insertError) {
            // Check if it's a duplicate key error (race condition)
            if (insertError.code === '23505') {
              console.log(`⚠️ Record already exists for ${profile.user_id}, skipping insert`);
            } else {
              throw new Error(`Failed to create link: ${insertError.message}`);
            }
          } else {
            console.log(`✅ Created referral_links_new record for ${profile.user_id}`);
            results.push({
              user_id: profile.user_id,
              action: 'created',
              details: 'Created missing referral_links_new record'
            });
            createdCount++;
          }
          continue;
        }

        // Case 2: Record exists but no locked sponsor
        if (!existingLink.locked_at && existingLink.sponsor_code_used) {
          console.log(`🔍 User ${profile.user_id} has code "${existingLink.sponsor_code_used}" but no locked sponsor`);

          let sponsorId: string | null = null;
          const codeUsed = existingLink.sponsor_code_used.trim().toUpperCase();

          // Try to resolve the code
          // First, check if it's a UUID
          const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
          if (uuidRegex.test(codeUsed)) {
            sponsorId = codeUsed.toLowerCase();
          } else {
            // It's a short code, look it up
            const { data: sponsorProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('referral_code', codeUsed)
              .maybeSingle();

            if (sponsorProfile) {
              sponsorId = sponsorProfile.user_id;
            }
          }

          if (sponsorId && sponsorId !== profile.user_id) {
            // Lock the referral
            const { error: lockError } = await supabase
              .from('referral_links_new')
              .update({
                sponsor_id: sponsorId,
                locked_at: new Date().toISOString(),
                capture_stage: 'admin_repair'
              })
              .eq('user_id', profile.user_id)
              .is('locked_at', null);

            if (lockError) {
              throw new Error(`Failed to lock referral: ${lockError.message}`);
            }

            console.log(`🔒 Locked ${profile.user_id} to sponsor ${sponsorId}`);
            results.push({
              user_id: profile.user_id,
              action: 'locked',
              details: `Locked to sponsor ${sponsorId} using code ${codeUsed}`
            });
            lockedCount++;
          } else {
            console.log(`⚠️ Could not resolve code "${codeUsed}" for ${profile.user_id}`);
            results.push({
              user_id: profile.user_id,
              action: 'failed',
              error: `Could not resolve sponsor code: ${codeUsed}`
            });
            failedCount++;
          }
        } else if (existingLink.locked_at) {
          // Already locked
          skippedCount++;
        } else {
          // No sponsor code used and not locked (organic user)
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Failed to process ${profile.user_id}:`, error);
        results.push({
          user_id: profile.user_id,
          action: 'failed',
          error: error.message
        });
        failedCount++;
      }
    }

    console.log(`📋 Repair summary: ${createdCount} created, ${lockedCount} locked, ${skippedCount} skipped, ${failedCount} failed`);

    // Step 3: Rebuild all trees
    console.log('🌳 Starting tree rebuild for all users...');
    
    const { data: usersToRebuild, error: rebuildFetchError } = await supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id, locked_at')
      .not('locked_at', 'is', null)
      .not('sponsor_id', 'is', null);

    if (rebuildFetchError) {
      console.error('Failed to fetch users for rebuild:', rebuildFetchError);
    } else {
      console.log(`Found ${usersToRebuild?.length || 0} users with locked sponsors to rebuild trees`);

      let treesRebuilt = 0;
      let treesFailed = 0;

      for (const userLink of usersToRebuild || []) {
        try {
          // Delete existing tree
          await supabase
            .from('referral_tree')
            .delete()
            .eq('user_id', userLink.user_id);

          // Build new tree
          const ancestors: Array<{ ancestor_id: string; level: number; direct_sponsor_id: string }> = [];
          const path: string[] = [userLink.user_id];
          
          let currentSponsor = userLink.sponsor_id;
          let currentLevel = 1;
          const directSponsor = userLink.sponsor_id;

          while (currentSponsor && currentLevel <= 50) {
            ancestors.push({ 
              ancestor_id: currentSponsor, 
              level: currentLevel,
              direct_sponsor_id: directSponsor
            });
            path.push(currentSponsor);

            const { data: nextLink } = await supabase
              .from('referral_links_new')
              .select('sponsor_id, locked_at')
              .eq('user_id', currentSponsor)
              .maybeSingle();

            if (!nextLink?.sponsor_id || !nextLink?.locked_at) {
              break;
            }

            currentSponsor = nextLink.sponsor_id;
            currentLevel++;
          }

          if (ancestors.length > 0) {
            const treeRecords = ancestors.map(({ ancestor_id, level, direct_sponsor_id }) => ({
              user_id: userLink.user_id,
              ancestor_id,
              level,
              path,
              direct_sponsor_id
            }));

            const { error: insertError } = await supabase
              .from('referral_tree')
              .insert(treeRecords);

            if (insertError) {
              throw new Error(`Failed to insert tree: ${insertError.message}`);
            }

            treesRebuilt++;
          }

        } catch (error) {
          console.error(`Failed to rebuild tree for ${userLink.user_id}:`, error);
          treesFailed++;
        }
      }

      console.log(`🌳 Tree rebuild complete: ${treesRebuilt} rebuilt, ${treesFailed} failed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        repair: {
          total: allUsers?.length || 0,
          created: createdCount,
          locked: lockedCount,
          skipped: skippedCount,
          failed: failedCount
        },
        trees: {
          rebuilt: usersToRebuild?.length || 0
        },
        results: results.filter(r => r.action !== 'skipped').slice(0, 100)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error repairing referral system:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
