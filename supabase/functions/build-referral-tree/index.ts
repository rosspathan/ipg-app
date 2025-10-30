import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildTreeRequest {
  user_id: string;
  include_unlocked?: boolean;
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

    const { user_id, include_unlocked = false } = await req.json() as BuildTreeRequest;

    console.log(`Building referral tree for user: ${user_id}, include_unlocked: ${include_unlocked}`);

    // Get the user's sponsor from referral_links_new
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links_new')
      .select('sponsor_id, locked_at')
      .eq('user_id', user_id)
      .single();

    if (linkError || !referralLink?.sponsor_id) {
      console.log('No sponsor found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No sponsor to build tree', levels: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check lock requirement if include_unlocked is false
    if (!include_unlocked && !referralLink?.locked_at) {
      console.log('Sponsor not locked and include_unlocked is false');
      return new Response(
        JSON.stringify({ success: true, message: 'No locked sponsor to build tree', levels: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ancestors: Array<{ ancestor_id: string; level: number }> = [];
    const path: string[] = [user_id];
    
    let currentSponsor = referralLink.sponsor_id;
    let currentLevel = 1;
    const directSponsor = referralLink.sponsor_id; // Normalized: always the direct sponsor

    // Detect cycles and walk up the chain, max 50 levels
    const visited = new Set<string>([user_id]);
    while (currentSponsor && currentLevel <= 50) {
      if (visited.has(currentSponsor)) {
        console.warn('Cycle detected in referral chain, stopping at', currentSponsor);
        break;
      }
      visited.add(currentSponsor);

      ancestors.push({ 
        ancestor_id: currentSponsor, 
        level: currentLevel,
        direct_sponsor_id: directSponsor // Constant for all levels
      });
      path.push(currentSponsor);

      // Get this sponsor's sponsor
      const { data: nextLink } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, locked_at')
        .eq('user_id', currentSponsor)
        .maybeSingle();

      if (!nextLink?.sponsor_id) {
        break; // Reached the top of the tree
      }

      // Check lock requirement if include_unlocked is false
      if (!include_unlocked && !nextLink?.locked_at) {
        break;
      }

      currentSponsor = nextLink.sponsor_id;
      currentLevel++;
    }

    console.log(`Found ${ancestors.length} ancestors for user ${user_id}`);

    // No pre-delete: we'll upsert below and then remove stale rows to avoid race conditions

    // Insert all tree records in batch
    if (ancestors.length > 0) {
      const treeRecords = ancestors.map(({ ancestor_id, level, direct_sponsor_id }) => ({
        user_id,
        ancestor_id,
        level,
        path,
        direct_sponsor_id
      }));

      // Upsert to avoid duplicate key errors under concurrency
      const { error: upsertError } = await supabase
        .from('referral_tree')
        .upsert(treeRecords, { onConflict: 'user_id,ancestor_id' });

      if (upsertError) {
        console.error('Error upserting tree records:', upsertError);
        throw new Error(`Failed to upsert tree records: ${upsertError.message}`);
      }

      // Remove any stale ancestors no longer in the computed list
      const ancestorIds = ancestors.map(a => a.ancestor_id);
      if (ancestorIds.length > 0) {
        const idList = `(${ancestorIds.join(',')})`;
        const { error: pruneError } = await supabase
          .from('referral_tree')
          .delete()
          .eq('user_id', user_id)
          .not('ancestor_id', 'in', idList);

        if (pruneError) {
          console.error('Error pruning stale tree records:', pruneError);
          // Not fatal; proceed without throwing to remain resilient
        }
      }
    }

    console.log(`Successfully built tree with ${ancestors.length} levels`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        levels_built: ancestors.length,
        ancestors: ancestors.map(a => a.ancestor_id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error building referral tree:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
