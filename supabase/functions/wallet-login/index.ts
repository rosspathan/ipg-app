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
        JSON.stringify({ error: "Email is required for wallet login", code: "EMAIL_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mnemonic && !privateKey) {
      return new Response(
        JSON.stringify({ error: "Either mnemonic or private key is required", code: "INPUT_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let walletAddress: string;

    // Determine wallet address from mnemonic or private key
    if (mnemonic) {
      // Normalize mnemonic: trim, lowercase, collapse all whitespace to single spaces
      const normalizedMnemonic = mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
      
      // Validate mnemonic format
      if (!validateMnemonic(normalizedMnemonic)) {
        console.log("[wallet-login] Invalid mnemonic format, word count:", normalizedMnemonic.split(' ').length);
        return new Response(
          JSON.stringify({ 
            error: "Invalid recovery phrase. Please check that all words are spelled correctly and in the right order.", 
            code: "INVALID_MNEMONIC" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const wallet = generateWalletFromMnemonic(normalizedMnemonic);
      walletAddress = wallet.address;
      console.log("[wallet-login] Derived address from mnemonic:", walletAddress);
    } else if (privateKey) {
      try {
        walletAddress = generateAddressFromPrivateKey(privateKey.trim());
        console.log("[wallet-login] Derived address from private key:", walletAddress);
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Invalid private key format", code: "INVALID_PRIVATE_KEY" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid login method", code: "INVALID_METHOD" }),
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

    // STRATEGY: First find user by email, then verify wallet matches
    // This gives clearer error messages to users
    
    console.log("[wallet-login] Looking up profile for email:", email);
    
    // First, try to find the user by email in profiles
    const { data: profileByEmail, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, wallet_address, email')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      console.error("[wallet-login] Profile lookup error:", profileError);
    }

    let userId: string | null = null;
    let storedWalletAddress: string | null = null;

    if (profileByEmail) {
      userId = profileByEmail.user_id;
      storedWalletAddress = profileByEmail.wallet_address;
      console.log("[wallet-login] Found profile by email, user_id:", userId, "wallet_address:", storedWalletAddress);
    } else {
      // Email not found in profiles, check if this is an old account
      // Try wallets_user table as fallback
      const { data: walletData } = await supabaseAdmin
        .from('wallets_user')
        .select('user_id, address')
        .eq('address', walletAddress.toLowerCase())
        .maybeSingle();

      if (walletData) {
        userId = walletData.user_id;
        storedWalletAddress = walletData.address;
        console.log("[wallet-login] Found user in wallets_user:", userId);
      }
    }

    // Check if we found the email/account at all
    if (!userId) {
      console.log("[wallet-login] No account found for email:", email);
      return new Response(
        JSON.stringify({ 
          error: "No account found with this email. Please check your email address or create a new account.", 
          code: "EMAIL_NOT_FOUND" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the account has a wallet linked
    if (!storedWalletAddress) {
      console.log("[wallet-login] Account has no wallet linked:", userId);
      return new Response(
        JSON.stringify({ 
          error: "No wallet is linked to this account. Please use password login and then import your wallet from Settings.", 
          code: "NO_WALLET_LINKED" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the derived wallet address matches the stored one
    if (storedWalletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log("[wallet-login] Wallet mismatch - stored:", storedWalletAddress, "derived:", walletAddress);
      return new Response(
        JSON.stringify({ 
          error: "The recovery phrase does not match the wallet linked to this account. Please double-check your words and their order.", 
          code: "WALLET_MISMATCH" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user details from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error("[wallet-login] User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "Account not found in authentication system", code: "AUTH_USER_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches the auth user email
    if (userData.user.email?.toLowerCase() !== email.toLowerCase()) {
      console.log("[wallet-login] Email mismatch with auth user");
      return new Response(
        JSON.stringify({ error: "Email does not match account records", code: "EMAIL_MISMATCH" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a magic link and extract the token for OTP verification
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    });

    if (linkError) {
      console.error("[wallet-login] Magic link generation error:", linkError);
      throw new Error(`Failed to generate login token: ${linkError.message}`);
    }

    // Extract the token from the action link
    const actionLink = linkData.properties.action_link;
    const urlParams = new URLSearchParams(new URL(actionLink).hash.substring(1) || new URL(actionLink).search);
    const token = urlParams.get('token');

    if (!token) {
      console.log("[wallet-login] Failed to extract token from action link:", actionLink);
      throw new Error("Failed to extract token from magic link");
    }

    console.log("[wallet-login] Successfully generated token for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: userId,
        email: userData.user.email,
        walletAddress: storedWalletAddress,
        token: token,
        message: "Login successful"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[wallet-login] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Login failed", code: "INTERNAL_ERROR" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
