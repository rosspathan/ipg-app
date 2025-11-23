import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  start_date?: string;
  end_date?: string;
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔄 [Backfill Badge Commissions] Function invoked at', new Date().toISOString());

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json() as BackfillRequest;
    const { start_date, end_date, dry_run = true } = requestBody;

    console.log('📊 Backfill parameters:', { start_date, end_date, dry_run });

    // Call the database function
    const { data, error } = await supabaseClient.rpc('backfill_badge_commissions', {
      p_start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: end_date || new Date().toISOString(),
      p_dry_run: dry_run
    });

    if (error) {
      console.error('❌ Backfill error:', error);
      throw error;
    }

    const results = data || [];
    const processed = results.filter((r: any) => r.action_taken?.startsWith('SUCCESS')).length;
    const skipped = results.filter((r: any) => r.action_taken?.startsWith('SKIPPED')).length;
    const errors = results.filter((r: any) => r.action_taken?.startsWith('ERROR')).length;

    const processingTime = Date.now() - startTime;
    console.log(`✅ Backfill complete: ${processed} processed, ${skipped} skipped, ${errors} errors (${processingTime}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        summary: {
          total: results.length,
          processed,
          skipped,
          errors
        },
        details: results,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Backfill function error:', {
      error: error,
      message: error?.message,
      stack: error?.stack,
      processing_time_ms: processingTime
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
        processing_time_ms: processingTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
