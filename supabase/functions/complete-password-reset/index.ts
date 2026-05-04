import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  code: string;
  newPassword: string;
}

const COMMON_PASSWORDS = new Set([
  "password","password1","password123","12345678","123456789","qwerty123",
  "abc12345","letmein1","welcome1","admin123","iloveyou","monkey123"
]);

function jerr(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<RequestBody>;
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const newPassword = body.newPassword || "";

    if (!email || !code || !newPassword) {
      return jerr("missing_fields", "Email, code, and new password are required.");
    }

    // Strong password validation (server-side authoritative)
    if (newPassword.length < 8) {
      return jerr("weak_password", "Password must be at least 8 characters.");
    }
    if (!/[A-Z]/.test(newPassword)) {
      return jerr("weak_password", "Password must contain an uppercase letter.");
    }
    if (!/[a-z]/.test(newPassword)) {
      return jerr("weak_password", "Password must contain a lowercase letter.");
    }
    if (!/\d/.test(newPassword)) {
      return jerr("weak_password", "Password must contain a number.");
    }
    if (newPassword.toLowerCase() === email) {
      return jerr("weak_password", "Password cannot be your email.");
    }
    if (COMMON_PASSWORDS.has(newPassword.toLowerCase())) {
      return jerr("weak_password", "This password is too common. Choose another.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up code (latest, regardless of used flag — we'll inspect)
    const { data: resetCodes, error: fetchError } = await supabaseAdmin
      .from("password_reset_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[complete-password-reset] fetch error:", fetchError.message);
      return jerr("server_error", "Could not verify reset code.", 500);
    }
    if (!resetCodes || resetCodes.length === 0) {
      return jerr("invalid_otp", "Invalid verification code.");
    }

    const resetCode = resetCodes[0];

    if (resetCode.used) {
      return jerr("reset_session_expired", "This reset code has already been used. Please request a new one.");
    }

    if (new Date() > new Date(resetCode.expires_at)) {
      return jerr("expired_otp", "Verification code has expired. Please request a new one.");
    }

    // Update user password (NEVER log the password)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetCode.user_id,
      { password: newPassword }
    );

    if (updateError) {
      const msg = String(updateError.message || "").toLowerCase();
      console.error("[complete-password-reset] auth update error:", updateError.message);
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("leaked") || msg.includes("compromis")) {
        return jerr("weak_password", "This password has been found in data breaches. Please choose a different one.");
      }
      if (msg.includes("same") || msg.includes("different from the old")) {
        return jerr("weak_password", "New password must be different from your current password.");
      }
      if (msg.includes("user not found")) {
        return jerr("user_not_found", "User account not found.", 404);
      }
      return jerr("server_error", "Failed to update password. Please try again.", 500);
    }

    // Mark code as used
    await supabaseAdmin
      .from("password_reset_codes")
      .update({ used: true })
      .eq("id", resetCode.id);

    // Invalidate all other sessions
    try {
      await supabaseAdmin.auth.admin.signOut(resetCode.user_id, "global");
    } catch (e) {
      console.warn("[complete-password-reset] signOut warning:", (e as Error).message);
    }

    // Audit log (no password content)
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        action: "password_reset_completed",
        target_type: "user",
        target_id: resetCode.user_id,
        metadata: { email, code_id: resetCode.id, ts: new Date().toISOString() },
      });
    } catch (_) { /* audit table optional */ }

    console.log(`[complete-password-reset] success user=${resetCode.user_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password has been reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[complete-password-reset] fatal:", error?.message || error);
    return jerr("server_error", "Internal server error.", 500);
  }
};

serve(handler);
