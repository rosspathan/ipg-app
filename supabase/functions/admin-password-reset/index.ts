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

    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return new Response(JSON.stringify({ error: "Email and new password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailLower = email.trim().toLowerCase();
    
    // Security check: only allow rosspathan@gmail.com to use this
    if (emailLower !== "rosspathan@gmail.com") {
      return new Response(JSON.stringify({ error: "Unauthorized email" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin password reset request for:", emailLower);

    // Find the user by email using pagination
    let targetUser = null;
    let page = 1;
    const perPage = 1000;
    
    while (!targetUser) {
      const { data: users, error: getUserError } = await supabase.auth.admin.listUsers({ page, perPage });
      
      if (getUserError) {
        console.error("Error listing users:", getUserError);
        return new Response(JSON.stringify({ error: "Failed to find user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetUser = users.users.find(u => u.email?.toLowerCase() === emailLower);
      
      if (users.users.length < perPage) break;
      page++;
    }
    
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const user = targetUser;

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Password updated successfully for ${emailLower}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password updated successfully. You can now login with your new password." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-password-reset error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});