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

    const ancestors: Array<{ ancestor_id: string; level: number; direct_sponsor_id: string }> = [];
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

    // Prepare records once
    const treeRecords = ancestors.map(({ ancestor_id, level, direct_sponsor_id }) => ({
      user_id,
      ancestor_id,
      level,
      path,
      direct_sponsor_id
    }));

    // 1) Update existing rows (level/path/direct_sponsor) safely
    if (treeRecords.length > 0) {
      const updatePromises = treeRecords.map((r) =>
        supabase
          .from('referral_tree')
          .update({ level: r.level, path: r.path, direct_sponsor_id: r.direct_sponsor_id })
          .eq('user_id', r.user_id)
          .eq('ancestor_id', r.ancestor_id)
      );
      const updateResults = await Promise.all(updatePromises);
      const updateError = updateResults.find(res => (res as any).error)?.error;
      if (updateError) {
        console.error('Error updating existing tree rows:', updateError);
        // Proceed; we'll still try inserts below
      }

      // 2) Insert missing rows, ignore duplicates at DB level (race-safe)
      const { error: insertError } = await supabase
        .from('referral_tree')
        .insert(treeRecords, { onConflict: 'user_id,ancestor_id', ignoreDuplicates: true });

      if (insertError) {
        console.error('Error inserting tree records with ignoreDuplicates:', insertError);
        throw new Error(`Failed to insert tree records: ${insertError.message}`);
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
