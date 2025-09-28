import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommitRequest {
  draw_id: string;
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

    const { draw_id } = await req.json() as CommitRequest;

    if (!draw_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎲 Committing draw ${draw_id}`);

    // Get draw config
    const { data: drawConfig, error: drawError } = await supabase
      .from('draw_configs')
      .select('*')
      .eq('id', draw_id)
      .single();

    if (drawError || !drawConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (drawConfig.state !== 'full' && drawConfig.state !== 'open') {
      return new Response(
        JSON.stringify({ success: false, error: 'Draw is not ready for commitment' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate server seed and hash using Web Crypto API
    const serverSeed = crypto.randomUUID() + '-' + Date.now() + '-' + Math.random().toString(36);
    const encoder = new TextEncoder();
    const data = encoder.encode(serverSeed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const serverSeedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate client seed (combination of ticket IDs for transparency)
    const { data: tickets } = await supabase
      .from('draw_tickets')
      .select('id')
      .eq('draw_id', draw_id)
      .order('created_at', { ascending: true });

    const clientSeed = tickets?.map(t => t.id).join('-') || crypto.randomUUID();

    // Update draw with commitment
    const { error: updateError } = await supabase
      .from('draw_configs')
      .update({
        state: 'drawing',
        server_seed_hash: serverSeedHash,
        server_seed: serverSeed, // Store for now, will be revealed later
        client_seed: clientSeed,
        nonce: 1
      })
      .eq('id', draw_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Draw ${draw_id} committed with hash: ${serverSeedHash.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        draw_id,
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        message: 'Draw committed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Draw commit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Draw commit failed', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});