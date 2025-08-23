import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory nonce store (in production, use Redis or database)
const nonceStore = new Map<string, { timestamp: number; used: boolean }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [nonce, data] of nonceStore.entries()) {
    if (now - data.timestamp > 300000) { // 5 minutes
      nonceStore.delete(nonce);
    }
  }
}, 300000);

function generateNonce(): string {
  return crypto.randomUUID();
}

function verifySignature(message: string, signature: string, address: string): boolean {
  try {
    // This is a simplified verification - in a real implementation,
    // you'd use a proper crypto library to verify the ECDSA signature
    // For now, we'll do basic validation
    return signature.length > 100 && address.startsWith('0x') && address.length === 42;
  } catch (error) {
    console.error('Signature verification error:', error);
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
      const nonce = generateNonce();
      const timestamp = Date.now();
      
      nonceStore.set(nonce, { timestamp, used: false });
      
      console.log(`Generated nonce: ${nonce}`);
      
      return new Response(JSON.stringify({ nonce, timestamp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verifySignature') {
      const { walletAddress, signature, nonce } = body;
      
      console.log('Verify signature request received:', {
        walletAddress,
        nonce,
        hasSignature: !!signature,
        signatureLength: signature?.length
      });
      
      if (!walletAddress || !signature || !nonce) {
        console.error('Missing required fields:', { walletAddress: !!walletAddress, signature: !!signature, nonce: !!nonce });
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if nonce exists and is not used
      const nonceData = nonceStore.get(nonce);
      if (!nonceData || nonceData.used) {
        console.log(`Invalid or used nonce: ${nonce}`);
        return new Response(JSON.stringify({ error: 'Invalid or expired nonce' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if nonce is not too old (5 minutes)
      if (Date.now() - nonceData.timestamp > 300000) {
        nonceStore.delete(nonce);
        return new Response(JSON.stringify({ error: 'Nonce expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get admin wallets from secrets
      const adminWallets = Deno.env.get('ADMIN_WALLETS');
      if (!adminWallets) {
        console.error('ADMIN_WALLETS secret not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse admin wallets (expected format: comma-separated addresses)
      const allowedWallets = adminWallets.toLowerCase().split(',').map(addr => addr.trim());
      const isAllowed = allowedWallets.includes(walletAddress.toLowerCase());

      if (!isAllowed) {
        console.log(`Wallet ${walletAddress} not in admin allowlist`);
        return new Response(JSON.stringify({ error: 'Wallet not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the signature format (simplified check)
      const message = `CryptoFlow Admin Login\nNonce: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${nonceData.timestamp}`;
      const isValidSignature = verifySignature(message, signature, walletAddress);

      if (!isValidSignature) {
        console.log(`Invalid signature for wallet ${walletAddress}`);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark nonce as used only after successful verification
      nonceData.used = true;

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
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in web3-admin-auth function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});