import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CleanupRequestBody = {
  value?: number;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // User-scoped auth client (for verifying identity)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured", details: "Missing service role key" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service-role client (bypasses RLS) for safe cleanup of known-bad test rows
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    let body: CleanupRequestBody = {};
    try {
      body = (await req.json()) as CleanupRequestBody;
    } catch {
      body = {};
    }

    // The known "fake balances" pattern value (8dp)
    const suspiciousValue =
      typeof body.value === "number" && Number.isFinite(body.value)
        ? body.value
        : 0.02886256;

    // Delete ONLY rows that match the duplicated test pattern
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("wallet_balances")
      .delete()
      .eq("user_id", user.id)
      .eq("available", suspiciousValue)
      .eq("locked", 0)
      .eq("total", suspiciousValue)
      .select("id, asset_id");

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Cleanup failed", details: deleteError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedRows?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: e?.message ?? String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
