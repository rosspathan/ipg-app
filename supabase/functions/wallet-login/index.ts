import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { mnemonicToSeedSync, validateMnemonic } from "npm:bip39@3.1.0";
import { HDKey } from "npm:@scure/bip32@1.3.3";
import { keccak_256 } from "npm:@noble/hashes@1.3.3/sha3";
import { getPublicKey as secpGetPublicKey } from "npm:@noble/secp256k1@1.7.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WalletLoginRequest {
  mnemonic?: string;
  privateKey?: string;
  email: string; // Needed for decryption key
}

// Generate wallet from mnemonic
function generateWalletFromMnemonic(mnemonic: string) {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);

  const path = "m/44'/60'/0'/0/0";
  const childKey = hdkey.derive(path);

  if (!childKey.privateKey) {
    throw new Error("Failed to derive private key");
  }

  // Derive uncompressed public key using secp256k1
  const publicKey = secpGetPublicKey(childKey.privateKey, false); // 65 bytes, starts with 0x04
  const addressBytes = keccak_256(publicKey.slice(1)).slice(-20);
  const address = "0x" + Array.from(addressBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();

  return { address };
}

// Generate address from private key
function generateAddressFromPrivateKey(privateKeyHex: string) {
  // Remove 0x prefix if present
  const pkHex = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const privateKey = new Uint8Array(pkHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

  // Derive uncompressed public key using secp256k1
  const publicKey = secpGetPublicKey(privateKey, false); // 65 bytes
  const addressBytes = keccak_256(publicKey.slice(1)).slice(-20);
  const address =
    "0x" + Array.from(addressBytes).map((b) => b.toString(16).padStart(2, "0")).join("")
      .toLowerCase();

  return address;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mnemonic, privateKey, email }: WalletLoginRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required for wallet login" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mnemonic && !privateKey) {
      return new Response(
        JSON.stringify({ error: "Either mnemonic or private key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let walletAddress: string;

    // Determine wallet address from mnemonic or private key
    if (mnemonic) {
      // Validate mnemonic format
      if (!validateMnemonic(mnemonic.trim())) {
        return new Response(
          JSON.stringify({ error: "Invalid mnemonic phrase" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const wallet = generateWalletFromMnemonic(mnemonic.trim());
      walletAddress = wallet.address;
    } else if (privateKey) {
      try {
        walletAddress = generateAddressFromPrivateKey(privateKey.trim());
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Invalid private key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid login method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

// Find user by wallet address
const { data: walletData, error: walletError } = await supabaseAdmin
  .from('wallets_user')
  .select('user_id, address')
  .eq('address', walletAddress.toLowerCase())
  .maybeSingle();

if (walletError || !walletData) {
  return new Response(
    JSON.stringify({ error: "Wallet not found. Please sign up first." }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

    // Get user details
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(walletData.user_id);
    
    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (userData.user.email?.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email does not match wallet owner" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

// Optionally update any usage metrics here if your schema supports it
// (Skipped: wallets_user table doesn't have last_used_at in current schema)

    // Generate session token (using OTP for passwordless login)
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify`,
      }
    });

    if (otpError) {
      throw new Error(`Failed to generate login token: ${otpError.message}`);
    }

    return new Response(
JSON.stringify({ 
  success: true,
  userId: walletData.user_id,
  email: userData.user.email,
  walletAddress: walletData.address,
  accessToken: otpData.properties.hashed_token,
  message: "Login successful"
}),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Wallet login error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Login failed" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
