import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RebuildRequest {
  force?: boolean;
  include_unlocked?: boolean;
  users?: string[];
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
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const { force = false, include_unlocked = true, users = [] } = await req.json() as RebuildRequest;

    console.log(`Starting v2 rebuild: force=${force}, include_unlocked=${include_unlocked}, users=${users.length || 'all'}`);

    // Build query for users to process
    let query = supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id, locked_at')
      .not('sponsor_id', 'is', null);

    // Apply locked filter if not including unlocked
    if (!include_unlocked) {
      query = query.not('locked_at', 'is', null);
    }

    // Filter by specific users if provided
    if (users.length > 0) {
      query = query.in('user_id', users);
    }

    const { data: usersToProcess, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    console.log(`Processing ${usersToProcess?.length || 0} users`);

    const results = {
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: [] as Array<{ user_id: string; error: string }>,
      samples: [] as Array<{ user_id: string; levels: number; sponsor_id: string }>
    };

    for (const userRecord of usersToProcess || []) {
      try {
        const userId = userRecord.user_id;
        const firstSponsor = userRecord.sponsor_id;

        // If force mode, delete existing tree for this user
        if (force) {
          const { error: deleteError } = await supabase
            .from('referral_tree')
            .delete()
            .eq('user_id', userId);

          if (deleteError) {
            console.error(`Error deleting tree for ${userId}:`, deleteError);
            results.errors.push({ user_id: userId, error: deleteError.message });
            continue;
          }
        } else {
          // Check if tree already exists
          const { data: existing } = await supabase
            .from('referral_tree')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (existing && existing.length > 0) {
            results.skipped++;
            continue;
          }
        }

        // Build the ancestor chain
        const ancestors: Array<{ ancestor_id: string; level: number }> = [];
        const path: string[] = [userId];
        
        let currentSponsor = firstSponsor;
        let currentLevel = 1;

        // Walk up the chain, max 50 levels
        while (currentSponsor && currentLevel <= 50) {
          ancestors.push({ 
            ancestor_id: currentSponsor, 
            level: currentLevel
          });
          path.push(currentSponsor);

          // Get this sponsor's sponsor
          let nextQuery = supabase
            .from('referral_links_new')
            .select('sponsor_id, locked_at')
            .eq('user_id', currentSponsor)
            .maybeSingle();

          const { data: nextLink } = await nextQuery;

          if (!nextLink?.sponsor_id) {
            break; // Reached the top of the tree
          }

          // Check if we should continue up the chain
          if (!include_unlocked && !nextLink.locked_at) {
            break; // Stop if we hit an unlocked link and include_unlocked is false
          }

          currentSponsor = nextLink.sponsor_id;
          currentLevel++;
        }

        // Insert all tree records in batch with upsert
        if (ancestors.length > 0) {
          const treeRecords = ancestors.map(({ ancestor_id, level }) => ({
            user_id: userId,
            ancestor_id,
            level,
            path,
            direct_sponsor_id: firstSponsor // Normalized: always the direct sponsor
          }));

          const { error: insertError } = await supabase
            .from('referral_tree')
            .upsert(treeRecords, { 
              onConflict: 'user_id,ancestor_id',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.error(`Error inserting tree for ${userId}:`, insertError);
            results.errors.push({ user_id: userId, error: insertError.message });
            continue;
          }

          results.inserted += ancestors.length;

          // Add to samples (first 100)
          if (results.samples.length < 100) {
            results.samples.push({
              user_id: userId,
              levels: ancestors.length,
              sponsor_id: firstSponsor
            });
          }
        }

        results.processed++;

      } catch (error) {
        console.error(`Error processing user ${userRecord.user_id}:`, error);
        results.errors.push({ 
          user_id: userRecord.user_id, 
          error: error.message 
        });
      }
    }

    console.log(`V2 Rebuild complete: processed=${results.processed}, inserted=${results.inserted}, skipped=${results.skipped}, errors=${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in v2 rebuild:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
