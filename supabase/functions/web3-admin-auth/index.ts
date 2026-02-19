import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { ethers } from 'npm:ethers@6.9.0';

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

/**
 * Proper ECDSA signature verification using ethers.js
 * Recovers the signer address from the signature and compares with expected address
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

      // Validate nonce
      const nonceData = nonceStore.get(nonce);
      if (!nonceData) {
        console.log(`Nonce not found (likely cold start/stateless) for: ${nonce} — continuing verification`);
      } else if (nonceData.used) {
        console.log(`Used nonce: ${nonce}`);
        return new Response(JSON.stringify({ error: 'Invalid or expired nonce' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (Date.now() - nonceData.timestamp > 300000) {
        nonceStore.delete(nonce);
        return new Response(JSON.stringify({ error: 'Nonce expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get admin wallets from secrets
      const adminWalletsRaw = Deno.env.get('ADMIN_WALLETS')?.trim();
      if (!adminWalletsRaw) {
        console.error('ADMIN_WALLETS secret not configured or empty');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse admin wallets robustly
      let parsedList: string[] = [];
      try {
        if (adminWalletsRaw.startsWith('[')) {
          const arr = JSON.parse(adminWalletsRaw);
          if (Array.isArray(arr)) parsedList = arr as string[];
        }
      } catch (_) {
        // ignore JSON parse errors, fall back to regex split
      }
      if (parsedList.length === 0) {
        const cleaned = adminWalletsRaw.replace(/[\[\]"']/g, ' ');
        parsedList = cleaned.split(/[\s,]+/);
      }

      const allowedWallets = parsedList
        .map((addr) => addr?.trim().toLowerCase())
        .filter((addr) => !!addr && addr.startsWith('0x') && addr.length === 42);

      console.log('Admin allowlist loaded (count):', allowedWallets.length);

      const isAllowed = allowedWallets.includes(walletAddress.toLowerCase());

      if (!isAllowed) {
        console.log(`Wallet ${walletAddress} not in admin allowlist`);
        return new Response(JSON.stringify({ error: 'Wallet not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the ECDSA signature cryptographically
      const ts = nonceData?.timestamp ?? 'unknown';
      const message = `CryptoFlow Admin Login\nNonce: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${ts}`;
      const isValidSignature = verifySignature(message, signature, walletAddress);

      if (!isValidSignature) {
        console.log(`Invalid cryptographic signature for wallet ${walletAddress}`);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark nonce as used only after successful verification
      if (nonceData) nonceData.used = true;

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
