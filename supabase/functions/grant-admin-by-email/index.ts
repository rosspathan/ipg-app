import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailLower = email.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower);
    if (!isEmail) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Grant admin by email request:", emailLower);

    // Try to find user by email via Admin API
    let userId: string | null = null;

    // Preferred: iterate pages and find the user
    let page = 1;
    const perPage = 200;
    while (page <= 10 && !userId) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers error:", error);
        break;
      }
      const match = data.users.find((u: any) => (u.email || "").toLowerCase() === emailLower);
      if (match) userId = match.id;
      if (data.users.length < perPage) break; // last page
      page += 1;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "User not found. Please sign up or log in with this email first, then try again.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert admin role into public.user_roles
    const { error: insertError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin", assigned_by: userId },
        { onConflict: "user_id,role" }
      );

    if (insertError) {
      console.error("Failed to grant admin:", insertError);
      return new Response(JSON.stringify({ error: "Failed to grant admin role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Granted admin role to ${emailLower} (user_id: ${userId})`);

    return new Response(
      JSON.stringify({ success: true, email: emailLower, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("grant-admin-by-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
