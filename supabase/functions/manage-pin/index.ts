/**
 * manage-pin — server-authoritative Security PIN management.
 *
 * Actions:
 *  - "status": returns { pin_set, locked_until } for the current user
 *  - "create": create or change PIN (requires old PIN if one already exists)
 *  - "reset_self": reserved for future flows — currently rejected
 *
 * Hashing is PBKDF2-SHA256 (200k iters) computed server-side. The PIN value
 * never enters the database. RLS-blocked writes to pin_hash/pin_salt/pin_set
 * are bypassed here via SERVICE_ROLE_KEY.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "UNAUTHORIZED" }, 200);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ success: false, error: "INVALID_TOKEN" }, 200);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "";

    // Always read the latest security row first
    const { data: row } = await supabase
      .from("security")
      .select("pin_set, pin_hash, pin_salt, locked_until, failed_attempts")
      .eq("user_id", user.id)
      .maybeSingle();

    if (action === "status") {
      return json({
        success: true,
        pin_set: !!row?.pin_set,
        locked_until: row?.locked_until ?? null,
      });
    }

    if (action === "create") {
      const newPin: string | undefined = body?.new_pin;
      const oldPin: string | undefined = body?.old_pin;

      if (!newPin || !/^\d{6}$/.test(newPin)) {
        return json({ success: false, error: "INVALID_PIN", message: "PIN must be exactly 6 digits." });
      }

      // If a PIN already exists, require old PIN to change it
      if (row?.pin_set && row.pin_hash && row.pin_salt) {
        if (!oldPin || !/^\d{6}$/.test(oldPin)) {
          return json({ success: false, error: "OLD_PIN_REQUIRED", message: "Enter your current PIN to change it." });
        }
        if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
          return json({
            success: false, error: "PIN_LOCKED",
            message: "PIN entry is temporarily locked. Try again later.",
            locked_until: row.locked_until,
          });
        }
        const oldHash = await hashPin(oldPin, row.pin_salt);
        if (oldHash !== row.pin_hash) {
          const attempts = (row.failed_attempts || 0) + 1;
          const shouldLock = attempts >= 5;
          await supabase.from("security").update({
            failed_attempts: attempts,
            locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
          }).eq("user_id", user.id);
          return json({
            success: false, error: "OLD_PIN_INVALID",
            message: shouldLock
              ? "Current PIN incorrect. Account locked for 30 minutes."
              : `Current PIN is incorrect. ${5 - attempts} attempts remaining.`,
          });
        }
      }

      const salt = generateSalt();
      const hash = await hashPin(newPin, salt);

      const { error: upsertErr } = await supabase
        .from("security")
        .upsert({
          user_id: user.id,
          pin_set: true,
          pin_hash: hash,
          pin_salt: salt,
          failed_attempts: 0,
          locked_until: null,
        }, { onConflict: "user_id" });

      if (upsertErr) {
        console.error("[manage-pin] upsert failed:", upsertErr);
        return json({ success: false, error: "DB_ERROR", message: "Could not save PIN. Please try again." }, 500);
      }

      await supabase.from("login_audit").insert({
        user_id: user.id,
        event: row?.pin_set ? "pin_changed" : "pin_set",
        device_info: { surface: "manage-pin" },
      });

      return json({ success: true, pin_set: true });
    }

    return json({ success: false, error: "UNKNOWN_ACTION" });
  } catch (e) {
    console.error("[manage-pin] error:", e);
    return json({ success: false, error: "INTERNAL_ERROR", message: "Unexpected error. Please try again." }, 500);
  }
});
