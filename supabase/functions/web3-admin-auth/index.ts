import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { ethers } from 'npm:ethers@6.9.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Proper ECDSA signature verification using ethers.js
 */
function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    if (!isValid) {
      console.error(`Signature mismatch: recovered=${recoveredAddress}, expected=${expectedAddress}`);
    }
    return isValid;
  } catch (error) {
    console.error('ECDSA signature verification failed:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...body } = await req.json();

    if (action === 'getNonce') {
      const { walletAddress } = body;
      if (!walletAddress) {
        return new Response(JSON.stringify({ error: 'Wallet address required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const nonce = crypto.randomUUID();
      const timestamp = Date.now();
      const expiresAt = new Date(timestamp + 300000).toISOString(); // 5 minutes

      // Store nonce in database for persistence across cold starts
      const { error: insertError } = await supabase
        .from('admin_auth_nonces')
        .insert({
          nonce,
          wallet_address: walletAddress.toLowerCase(),
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error('Failed to store nonce:', insertError);
        return new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Clean up expired nonces
      await supabase
        .from('admin_auth_nonces')
        .delete()
        .lt('expires_at', new Date().toISOString());

      console.log(`Generated nonce: ${nonce} for wallet: ${walletAddress}`);
      
      return new Response(JSON.stringify({ nonce, timestamp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verifySignature') {
      const { walletAddress, signature, nonce } = body;
      
      if (!walletAddress || !signature || !nonce) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Atomic nonce validation: mark as used in a single operation
      const { data: nonceData, error: nonceError } = await supabase
        .from('admin_auth_nonces')
        .update({ used_at: new Date().toISOString() })
        .eq('nonce', nonce)
        .eq('wallet_address', walletAddress.toLowerCase())
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
        .select()
        .single();

      if (nonceError || !nonceData) {
        console.log(`Invalid, expired, or already-used nonce: ${nonce}`);
        return new Response(JSON.stringify({ error: 'Invalid or expired nonce' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get admin wallets from secrets
      const adminWalletsRaw = Deno.env.get('ADMIN_WALLETS')?.trim();
      if (!adminWalletsRaw) {
        console.error('ADMIN_WALLETS secret not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse admin wallets
      let parsedList: string[] = [];
      try {
        if (adminWalletsRaw.startsWith('[')) {
          const arr = JSON.parse(adminWalletsRaw);
          if (Array.isArray(arr)) parsedList = arr as string[];
        }
      } catch (_) { /* fall through */ }
      if (parsedList.length === 0) {
        const cleaned = adminWalletsRaw.replace(/[\[\]"']/g, ' ');
        parsedList = cleaned.split(/[\s,]+/);
      }

      const allowedWallets = parsedList
        .map((addr) => addr?.trim().toLowerCase())
        .filter((addr) => !!addr && addr.startsWith('0x') && addr.length === 42);

      const isAllowed = allowedWallets.includes(walletAddress.toLowerCase());

      if (!isAllowed) {
        console.log(`Wallet ${walletAddress} not in admin allowlist`);
        return new Response(JSON.stringify({ error: 'Wallet not authorized' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ECDSA signature
      const ts = new Date(nonceData.created_at).getTime();
      const message = `CryptoFlow Admin Login\nNonce: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${ts}`;
      const isValidSignature = verifySignature(message, signature, walletAddress);

      if (!isValidSignature) {
        console.log(`Invalid cryptographic signature for wallet ${walletAddress}`);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log admin auth attempt for audit
      await supabase.from('admin_actions_log').insert({
        admin_user_id: walletAddress.toLowerCase(),
        action_type: 'web3_admin_login',
        details: { wallet: walletAddress, nonce, timestamp: Date.now() }
      });

      console.log(`Admin login successful for wallet: ${walletAddress}`);

      return new Response(JSON.stringify({ 
        success: true, 
        isAdmin: true,
        walletAddress,
        message: 'Admin authentication successful'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in web3-admin-auth function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
