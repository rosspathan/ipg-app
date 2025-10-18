import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildTreeRequest {
  user_id: string;
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

    const { user_id } = await req.json() as BuildTreeRequest;

    console.log(`Building referral tree for user: ${user_id}`);

    // Get the user's sponsor from referral_links_new
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links_new')
      .select('sponsor_id, locked_at')
      .eq('user_id', user_id)
      .single();

    if (linkError || !referralLink?.sponsor_id || !referralLink?.locked_at) {
      console.log('No locked sponsor found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No sponsor to build tree', levels: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ancestors: Array<{ ancestor_id: string; level: number }> = [];
    const path: string[] = [user_id];
    
    let currentSponsor = referralLink.sponsor_id;
    let currentLevel = 1;

    // Walk up the chain, max 50 levels
    while (currentSponsor && currentLevel <= 50) {
      ancestors.push({ ancestor_id: currentSponsor, level: currentLevel });
      path.push(currentSponsor);

      // Get this sponsor's sponsor
      const { data: nextLink } = await supabase
        .from('referral_links_new')
        .select('sponsor_id, locked_at')
        .eq('user_id', currentSponsor)
        .maybeSingle();

      if (!nextLink?.sponsor_id || !nextLink?.locked_at) {
        break; // Reached the top of the tree
      }

      currentSponsor = nextLink.sponsor_id;
      currentLevel++;
    }

    console.log(`Found ${ancestors.length} ancestors for user ${user_id}`);

    // Insert all tree records in batch
    if (ancestors.length > 0) {
      const treeRecords = ancestors.map(({ ancestor_id, level }) => ({
        user_id,
        ancestor_id,
        level,
        path
      }));

      const { error: insertError } = await supabase
        .from('referral_tree')
        .insert(treeRecords);

      if (insertError) {
        console.error('Error inserting tree records:', insertError);
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
