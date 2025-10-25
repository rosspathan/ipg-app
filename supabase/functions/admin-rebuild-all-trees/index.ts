import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RebuildResult {
  user_id: string;
  status: 'success' | 'failed' | 'skipped';
  levels_built?: number;
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

    const { force } = await req.json();

    console.log(`Starting rebuild of all referral trees (force: ${force})`);

    // Get all users with locked sponsors
    const { data: users, error: usersError } = await supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id, locked_at')
      .not('locked_at', 'is', null)
      .not('sponsor_id', 'is', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${users?.length || 0} users with locked sponsors`);

    const results: RebuildResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const userLink of users || []) {
      try {
        // Check if tree already exists
        if (!force) {
          const { data: existingTree, error: treeCheckError } = await supabase
            .from('referral_tree')
            .select('user_id')
            .eq('user_id', userLink.user_id)
            .limit(1);

          if (!treeCheckError && existingTree && existingTree.length > 0) {
            console.log(`Skipping ${userLink.user_id} - tree already exists`);
            results.push({
              user_id: userLink.user_id,
              status: 'skipped'
            });
            skippedCount++;
            continue;
          }
        }

        // Delete existing tree if force rebuild
        if (force) {
          const { error: deleteError } = await supabase
            .from('referral_tree')
            .delete()
            .eq('user_id', userLink.user_id);

          if (deleteError) {
            console.error(`Error deleting tree for ${userLink.user_id}:`, deleteError);
          }
        }

        // Build the tree by walking up the chain
        const ancestors: Array<{ ancestor_id: string; level: number; direct_sponsor_id: string }> = [];
        const path: string[] = [userLink.user_id];
        
        let currentSponsor = userLink.sponsor_id;
        let currentLevel = 1;
        let directSponsor = userLink.sponsor_id;

        while (currentSponsor && currentLevel <= 50) {
          ancestors.push({ 
            ancestor_id: currentSponsor, 
            level: currentLevel,
            direct_sponsor_id: directSponsor
          });
          path.push(currentSponsor);

          // Get this sponsor's sponsor
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

        // Insert tree records
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

          console.log(`Built tree for ${userLink.user_id}: ${ancestors.length} levels`);
          results.push({
            user_id: userLink.user_id,
            status: 'success',
            levels_built: ancestors.length
          });
          successCount++;
        } else {
          results.push({
            user_id: userLink.user_id,
            status: 'skipped',
            error: 'No ancestors found'
          });
          skippedCount++;
        }

      } catch (error) {
        console.error(`Failed to build tree for ${userLink.user_id}:`, error);
        results.push({
          user_id: userLink.user_id,
          status: 'failed',
          error: error.message
        });
        failedCount++;
      }
    }

    console.log(`Rebuild complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        total: users?.length || 0,
        successful: successCount,
        failed: failedCount,
        skipped: skippedCount,
        results: results.slice(0, 100) // Return first 100 for performance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error rebuilding trees:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
