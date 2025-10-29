import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixBadgeHoldingsRequest {
  user_id: string;
  badge_name: string;
  amount_paid: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, badge_name, amount_paid }: FixBadgeHoldingsRequest = await req.json();

    console.log('[fix-badge-holdings] Fixing badge for user:', user_id);
    console.log('[fix-badge-holdings] Badge:', badge_name);
    console.log('[fix-badge-holdings] Amount paid:', amount_paid);

    // Check if record already exists
    const { data: existing } = await supabase
      .from('user_badge_holdings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      console.log('[fix-badge-holdings] Record exists, updating...');
      const { data: updated, error: updateError } = await supabase
        .from('user_badge_holdings')
        .update({
          current_badge: badge_name,
          amount_paid: amount_paid,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'updated',
          data: updated 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('[fix-badge-holdings] Creating new record...');
      const { data: inserted, error: insertError } = await supabase
        .from('user_badge_holdings')
        .insert({
          user_id: user_id,
          current_badge: badge_name,
          amount_paid: amount_paid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'created',
          data: inserted 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[fix-badge-holdings] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
