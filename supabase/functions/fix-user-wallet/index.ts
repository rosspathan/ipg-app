import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[fix-user-wallet] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[fix-user-wallet] Processing for user:", userId);

    // Fetch the user's backup wallet address
    const { data: backup, error: backupError } = await supabase
      .from("encrypted_wallet_backups")
      .select("wallet_address")
      .eq("user_id", userId)
      .maybeSingle();

    if (backupError) {
      console.error("[fix-user-wallet] Error fetching backup:", backupError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch wallet backup" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!backup?.wallet_address) {
      return new Response(
        JSON.stringify({ error: "No wallet backup found. Cannot fix wallet." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correctAddress = backup.wallet_address;
    console.log("[fix-user-wallet] Correct address from backup:", correctAddress.slice(0, 10) + "...");

    // Fetch current profile to log the before state
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("wallet_address, bsc_wallet_address, wallet_addresses")
      .eq("user_id", userId)
      .maybeSingle();

    const oldWalletAddress = currentProfile?.wallet_address || null;
    const oldBscAddress = currentProfile?.bsc_wallet_address || null;

    // Build the wallet_addresses JSON with correct format
    const walletAddresses = {
      evm: {
        mainnet: correctAddress,
        bsc: correctAddress
      },
      "bsc-mainnet": correctAddress,
      "evm-mainnet": correctAddress,
      "bsc": correctAddress
    };

    // Update the profile with the correct wallet address
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        wallet_address: correctAddress,
        bsc_wallet_address: correctAddress,
        wallet_addresses: walletAddresses,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[fix-user-wallet] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update wallet address" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action for audit purposes
    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "wallet_address_fixed",
        resource_type: "profile",
        resource_id: userId,
        old_values: { wallet_address: oldWalletAddress, bsc_wallet_address: oldBscAddress },
        new_values: { wallet_address: correctAddress, bsc_wallet_address: correctAddress },
      });
    } catch (auditErr) {
      console.warn("[fix-user-wallet] Audit log failed:", auditErr);
    }

    console.log("[fix-user-wallet] Successfully fixed wallet for user:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wallet address synchronized successfully",
        wallet_address: correctAddress,
        old_wallet_address: oldWalletAddress
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[fix-user-wallet] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
