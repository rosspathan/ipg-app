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

    const { action } = await req.json();

    if (action === 'preview') {
      // Find all badge purchases that don't have corresponding commission records
      const { data: missingCommissions, error } = await supabase.rpc('calculate_retroactive_commissions');
      
      if (error) throw error;

      const totalMissing = (missingCommissions || []).reduce((sum: number, item: any) => 
        sum + Number(item.missing_commission), 0
      );
      const uniqueSponsors = new Set((missingCommissions || []).map((item: any) => item.sponsor_id)).size;

      return new Response(
        JSON.stringify({
          success: true,
          preview: missingCommissions,
          summary: {
            total_entries: missingCommissions?.length || 0,
            unique_sponsors: uniqueSponsors,
            total_bsk: totalMissing
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'execute') {
      // Record audit entry
      const { data: auditEntry } = await supabase
        .from('retroactive_commission_audit')
        .insert({
          executed_by: user.id,
          status: 'in_progress',
          notes: 'Retroactive commission payment initiated'
        })
        .select()
        .single();

      // Execute retroactive payment
      const { data, error } = await supabase.rpc('pay_retroactive_commissions');
      
      if (error) {
        // Update audit with error
        await supabase
          .from('retroactive_commission_audit')
          .update({
            status: 'failed',
            notes: `Error: ${error.message}`,
            execution_completed_at: new Date().toISOString()
          })
          .eq('id', auditEntry.id);
        
        throw error;
      }

      const result = data?.[0];

      // Update audit with success
      await supabase
        .from('retroactive_commission_audit')
        .update({
          status: 'completed',
          total_sponsors_credited: result?.total_sponsors_credited,
          total_commissions_paid: result?.total_commissions_paid,
          total_entries_created: result?.total_entries_created,
          execution_completed_at: new Date().toISOString(),
          notes: 'Retroactive commission payment completed successfully'
        })
        .eq('id', auditEntry.id);

      console.log('Retroactive payment completed:', result);

      return new Response(
        JSON.stringify({
          success: true,
          result,
          audit_id: auditEntry.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "preview" or "execute"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retroactive commission payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
