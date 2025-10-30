import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  display_name?: string;
  phone?: string;
  password?: string;
  account_status?: "active" | "suspended" | "pending";
  kyc_status?: "none" | "pending" | "approved" | "rejected";
  initial_bsk_balance?: number;
  role?: "user" | "admin";
  send_welcome_email?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role_name")
      .eq("user_id", adminUser.id)
      .eq("role_name", "admin")
      .single();

    if (roleError || !adminRole) {
      throw new Error("Insufficient permissions - admin role required");
    }

    const requestData: CreateUserRequest = await req.json();

    // Validate email
    if (!requestData.email || !requestData.email.includes("@")) {
      throw new Error("Invalid email address");
    }

    // Generate password if not provided
    const password = requestData.password || generateSecurePassword();

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: requestData.display_name,
        phone: requestData.phone,
      },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error("User creation failed - no user returned");
    }

    // Update profile with additional fields
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: requestData.display_name,
        phone: requestData.phone,
        account_status: requestData.account_status || "active",
        kyc_status: requestData.kyc_status || "none",
      })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Add initial BSK balance if specified
    if (requestData.initial_bsk_balance && requestData.initial_bsk_balance > 0) {
      const { error: balanceError } = await supabaseAdmin
        .from("user_bsk_balances")
        .upsert({
          user_id: newUser.user.id,
          withdrawable_balance: requestData.initial_bsk_balance,
          holding_balance: 0,
        });

      if (balanceError) {
        console.error("Balance initialization error:", balanceError);
      }
    }

    // Assign admin role if specified
    if (requestData.role === "admin") {
      const { error: roleAssignError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role_name: "admin",
        });

      if (roleAssignError) {
        console.error("Role assignment error:", roleAssignError);
      }
    }

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      event_type: "admin.user.created",
      admin_user_id: adminUser.id,
      target_user_id: newUser.user.id,
      changes: {
        email: requestData.email,
        display_name: requestData.display_name,
        account_status: requestData.account_status,
        kyc_status: requestData.kyc_status,
        role: requestData.role,
      },
      metadata: {
        ip_address: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: requestData.email,
        temporary_password: requestData.password ? undefined : password,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}
