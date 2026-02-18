import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TARGET_ADDRESS = '0x26CdD408D16E3C47F08ee3222f9CA765D5e5aD88';

    // Check all possible private key secrets
    const keysToCheck = [
      'ADMIN_WALLET_PRIVATE_KEY',
      'MIGRATION_WALLET_PRIVATE_KEY',
    ];

    const results: Record<string, any> = {};

    for (const keyName of keysToCheck) {
      const privateKey = Deno.env.get(keyName);
      if (!privateKey) {
        results[keyName] = { status: 'not_set' };
        continue;
      }

      try {
        const wallet = new ethers.Wallet(privateKey);
        const derivedAddress = wallet.address;
        const isMatch = derivedAddress.toLowerCase() === TARGET_ADDRESS.toLowerCase();

        results[keyName] = {
          status: 'found',
          derived_address: derivedAddress,
          matches_scam_wallet: isMatch,
        };
      } catch (e) {
        results[keyName] = { status: 'invalid_key', error: e.message };
      }
    }

    return new Response(
      JSON.stringify({
        target_address: TARGET_ADDRESS,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
