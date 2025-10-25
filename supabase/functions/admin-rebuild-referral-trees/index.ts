import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { force = false } = await req.json().catch(() => ({ force: false }));

    console.log(`Starting referral tree rebuild (force=${force})`);

    // Get all users with locked sponsors
    let query = supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id')
      .not('sponsor_id', 'is', null)
      .not('locked_at', 'is', null);

    const { data: usersWithSponsors, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    console.log(`Found ${usersWithSponsors?.length || 0} users with locked sponsors`);

    const results = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const link of usersWithSponsors || []) {
      try {
        // Check if tree already exists
        if (!force) {
          const { data: existingTree } = await supabase
            .from('referral_tree')
            .select('id')
            .eq('user_id', link.user_id)
            .limit(1);

          if (existingTree && existingTree.length > 0) {
            results.push({
              user_id: link.user_id,
              status: 'skipped',
              reason: 'Tree already exists'
            });
            skippedCount++;
            continue;
          }
        } else {
          // Force mode: delete existing tree first
          await supabase
            .from('referral_tree')
            .delete()
            .eq('user_id', link.user_id);
        }

        // Build the tree by walking up the chain
        const ancestors: Array<{ ancestor_id: string; level: number; direct_sponsor_id: string }> = [];
        const path: string[] = [link.user_id];
        
        let currentSponsor = link.sponsor_id;
        let currentLevel = 1;
        let directSponsor = link.sponsor_id;

        // Walk up the chain, max 50 levels
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
            break; // Reached the top
          }

          currentSponsor = nextLink.sponsor_id;
          currentLevel++;
        }

        // Insert all tree records in batch
        if (ancestors.length > 0) {
          const treeRecords = ancestors.map(({ ancestor_id, level, direct_sponsor_id }) => ({
            user_id: link.user_id,
            ancestor_id,
            level,
            path,
            direct_sponsor_id
          }));

          const { error: insertError } = await supabase
            .from('referral_tree')
            .insert(treeRecords);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }
        }

        results.push({
          user_id: link.user_id,
          status: 'success',
          levels: ancestors.length
        });
        successCount++;

      } catch (error: any) {
        console.error(`Error building tree for ${link.user_id}:`, error);
        results.push({
          user_id: link.user_id,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    const summary = {
      total: usersWithSponsors?.length || 0,
      success: successCount,
      skipped: skippedCount,
      errors: errorCount
    };

    console.log('Rebuild complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results: results.slice(0, 100) // Return first 100 for display
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in referral tree rebuild:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
