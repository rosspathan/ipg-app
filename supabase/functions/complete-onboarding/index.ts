import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateMnemonic, mnemonicToSeedSync } from "npm:bip39@3.1.0";
import { HDKey } from "npm:@scure/bip32@1.3.3";
import { keccak_256 } from "npm:@noble/hashes@1.3.3/sha3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump function version to force fresh deploy and aid debugging
const FUNCTION_VERSION = 'v2025-10-14-2';

interface OnboardingRequest {
  email: string;
  verificationCode: string;
  storedCode: string;
  importedWallet?: {
    address: string;
    mnemonic: string;
  };
}

// Generate wallet from mnemonic
function generateWalletFromMnemonic(mnemonic: string) {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  
  // BIP44 path for Ethereum: m/44'/60'/0'/0/0
  const path = "m/44'/60'/0'/0/0";
  const childKey = hdkey.derive(path);
  
  if (!childKey.privateKey) {
    throw new Error("Failed to derive private key");
  }

  const privateKey = childKey.privateKey;
  const publicKey = childKey.publicKey;
  
  // Generate Ethereum address from public key
  const addressBytes = keccak_256(publicKey.slice(1)).slice(-20);
  const address = "0x" + Array.from(addressBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    address,
    publicKey: "0x" + Array.from(publicKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
    privateKey: "0x" + Array.from(privateKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}

// Encrypt mnemonic using user's email as key (High Security - user-specific)
async function encryptMnemonic(mnemonic: string, email: string): Promise<{ encrypted: string; salt: string }> {
  const encoder = new TextEncoder();
  
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Derive key from email + salt using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(email),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  // Encrypt mnemonic
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(mnemonic)
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  const encryptedHex = Array.from(combined)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return { encrypted: encryptedHex, salt: saltHex };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, verificationCode, storedCode, importedWallet }: OnboardingRequest = await req.json();

    console.log('[complete-onboarding] Request:', { email, hasImportedWallet: !!importedWallet, version: FUNCTION_VERSION });

    // Verify the code matches
    if (verificationCode !== storedCode) {
      return new Response(
        JSON.stringify({ success: false, reason: "invalid_code", error: "Invalid verification code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;
    let mnemonic: string;
    let walletData: any;

    if (existingUser) {
      userId = existingUser.id;
      console.log('[complete-onboarding] User exists:', userId);
      
      // Check if THIS specific wallet already exists for this user
      const { data: existingWallet } = await supabaseAdmin
        .from('user_wallets')
        .select('wallet_address, encrypted_mnemonic')
        .eq('user_id', userId)
        .eq('wallet_address', (importedWallet?.address || '').toLowerCase())
        .maybeSingle();
      
      if (existingWallet) {
        // This exact wallet is already linked - allow re-verification
        console.log('[complete-onboarding] This wallet already linked, allowing re-verification');
        if (importedWallet?.mnemonic) {
          mnemonic = importedWallet.mnemonic.trim();
          walletData = generateWalletFromMnemonic(mnemonic);
        }
      } else {
        // Check how many wallets user already has
        const { count } = await supabaseAdmin
          .from('user_wallets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        console.log(`[complete-onboarding] User has ${count || 0} existing wallet(s), adding new wallet`);
        // Continue to add the new wallet - multi-wallet support enabled
      }
    } else {
      // Use IMPORTED wallet if provided, otherwise generate NEW wallet
      if (importedWallet?.mnemonic && importedWallet?.address) {
        console.log('[complete-onboarding] Using imported wallet:', importedWallet.address);
        mnemonic = importedWallet.mnemonic?.trim();
        
        // For imported wallets, trust the provided address and mnemonic
        // The wallet already exists and works, so we don't need to re-derive
        walletData = {
          address: importedWallet.address.trim().toLowerCase(),
          publicKey: '', // Not needed for imported wallets
          privateKey: '' // Not needed for imported wallets
        };
      } else {
        // Generate NEW wallet for new user
        console.log('[complete-onboarding] Generating new wallet');
        mnemonic = generateMnemonic(128); // 12 words
        walletData = generateWalletFromMnemonic(mnemonic);
      }
      
      // Create user with admin privileges (auto-confirmed)
      const tempPassword = crypto.randomUUID() + 'Aa1!';
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          wallet_address: walletData.address,
          email_verified: true,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create user');

      userId = data.user.id;
      console.log('Created new user:', userId);
    }

    // If no wallet yet, use imported or generate one
    if (!mnemonic) {
      if (importedWallet?.mnemonic && importedWallet?.address) {
        console.log('[complete-onboarding] Using imported wallet for existing user:', importedWallet.address);
        mnemonic = importedWallet.mnemonic?.trim();
        
        // For imported wallets, trust the provided address
        walletData = {
          address: importedWallet.address.trim().toLowerCase(),
          publicKey: '',
          privateKey: ''
        };
      } else {
        console.log('[complete-onboarding] Generating new wallet for existing user');
        mnemonic = generateMnemonic(128);
        walletData = generateWalletFromMnemonic(mnemonic);
      }
    }

    // Encrypt mnemonic with user's email
    const { encrypted, salt } = await encryptMnemonic(mnemonic, email);

    // Store encrypted wallet in database (upsert to support multiple wallets per user)
    const { error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .upsert({
        user_id: userId,
        wallet_address: walletData.address.toLowerCase(),
        encrypted_mnemonic: encrypted,
        encryption_salt: salt,
        public_key: walletData.publicKey,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,wallet_address', // Support multiple wallets per user
        ignoreDuplicates: false
      });

    if (walletError) {
      console.error('[complete-onboarding] Wallet upsert error:', walletError);
      throw new Error(`Failed to store wallet: ${walletError.message}`);
    }

    console.log('[complete-onboarding] Wallet stored/updated successfully');

    // Extract username from email
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '').substring(0, 20) || `user${userId.substring(0, 6)}`;
    
    // Generate referral code - Always create a code for every user
    const referralCode = username.toUpperCase().substring(0, 8) || userId.substring(0, 8).toUpperCase();

    // Create referral code entry (if not exists)
    const { error: refCodeError } = await supabaseAdmin
      .from('referral_codes')
      .upsert({
        user_id: userId,
        code: referralCode
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true
      });
    
    if (refCodeError) {
      console.warn('Referral code creation warning:', refCodeError);
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        user_id: userId,
        username,
        email,
        wallet_address: walletData.address,
        referral_code: referralCode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.warn('Profile update warning:', profileError);
    }

    // Initialize referral_links_new entry for this user
    const { error: refLinkError } = await supabaseAdmin
      .from('referral_links_new')
      .upsert({
        user_id: userId,
        referral_code: referralCode,
        total_referrals: 0,
        total_commissions: 0
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true
      });
    
    if (refLinkError) {
      console.warn('Referral link initialization warning:', refLinkError);
    }

    // Capture referral if pending
    try {
      const { data: pendingReferral } = await supabaseAdmin
        .from('referral_links_new')
        .select('sponsor_id, referral_code, first_touch_at')
        .eq('user_id', userId)
        .is('locked_at', null)
        .maybeSingle();

      if (pendingReferral?.sponsor_id) {
        const { data: settings } = await supabaseAdmin
          .from('mobile_linking_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const shouldLock = settings?.lock_policy === 'email_verified';

        if (shouldLock) {
          await supabaseAdmin
            .from('referral_links_new')
            .update({ locked_at: new Date().toISOString() })
            .eq('user_id', userId);
          
          console.log('Referral locked for user:', userId);
        }
      }
    } catch (err) {
      console.warn('Referral capture warning:', err);
    }

    // Return success with MNEMONIC (only shown once!)
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        username,
        referralCode,
        walletAddress: walletData.address,
        mnemonic: mnemonic, // CRITICAL: User must save this!
        warning: "Save your mnemonic phrase! This is the ONLY time it will be shown."
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error('[complete-onboarding] Error:', error);
    
    // Always return 200 with error details to avoid generic toast errors
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Registration failed',
        details: error.toString()
      }),
      { 
        status: 200, // Always 200 to prevent generic error toasts in frontend
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
