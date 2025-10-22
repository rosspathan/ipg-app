import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RebuildRequest {
  user_ids?: string[];  // Optional: specific users, otherwise all users with locked sponsors
  force?: boolean;      // Force rebuild even if tree exists
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

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_ids, force } = await req.json() as RebuildRequest;

    console.log('🔧 Starting referral tree rebuild...', { user_ids, force });

    // Get users that need tree building
    let query = supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id')
      .not('sponsor_id', 'is', null)
      .not('locked_at', 'is', null);

    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: referralLinks, error: linksError } = await query;

    if (linksError) {
      throw new Error(`Failed to fetch referral links: ${linksError.message}`);
    }

    if (!referralLinks || referralLinks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users found with locked sponsors',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${referralLinks.length} users with locked sponsors`);

    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const link of referralLinks) {
      try {
        // Check if tree already exists
        if (!force) {
          const { data: existingTree } = await supabase
            .from('referral_tree')
            .select('user_id')
            .eq('user_id', link.user_id)
            .limit(1)
            .maybeSingle();

          if (existingTree) {
            console.log(`⏭️  Skipping ${link.user_id} - tree already exists`);
            skipCount++;
            results.push({
              user_id: link.user_id,
              status: 'skipped',
              reason: 'tree_already_exists'
            });
            continue;
          }
        } else {
          // Delete existing tree if force rebuild
          await supabase
            .from('referral_tree')
            .delete()
            .eq('user_id', link.user_id);
        }

        // Call build-referral-tree function
        const { data: buildResult, error: buildError } = await supabase.functions.invoke(
          'build-referral-tree',
          {
            body: { user_id: link.user_id }
          }
        );

        if (buildError) {
          console.error(`❌ Failed to build tree for ${link.user_id}:`, buildError);
          errorCount++;
          results.push({
            user_id: link.user_id,
            status: 'error',
            error: buildError.message
          });
        } else {
          console.log(`✅ Built tree for ${link.user_id}:`, buildResult);
          successCount++;
          results.push({
            user_id: link.user_id,
            status: 'success',
            levels: buildResult.levels_built
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${link.user_id}:`, error);
        errorCount++;
        results.push({
          user_id: link.user_id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`🎉 Rebuild complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: referralLinks.length,
          success: successCount,
          skipped: skipCount,
          errors: errorCount
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error rebuilding referral trees:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
