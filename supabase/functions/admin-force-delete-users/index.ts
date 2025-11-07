// Admin Force Delete Users by Email
// Deletes auth users by email with optional soft delete, removes profile rows first,
// and neutralizes accounts if deletion fails.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForceDeleteBody {
  emails: string[];
  dry_run?: boolean;
  soft_delete?: boolean; // default true; if false => hard delete
  remove_profiles?: boolean; // default true
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase env");
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as ForceDeleteBody;
    const rawEmails = Array.isArray(body.emails) ? body.emails : [];
    const dryRun = !!body.dry_run;
    const softDelete = body.soft_delete ?? true;
    const removeProfiles = body.remove_profiles ?? true;

    const emails = [...new Set(
      rawEmails
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e.length > 0)
    )];

    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`🚨 Force delete requested for ${emails.length} identifier(s). dry_run=${dryRun}, soft_delete=${softDelete}`);

    // Build a map of identifier -> user by searching multiple sources
    const identifierSet = new Set(emails);
    const found: Record<string, any> = {};
    
    // Helper to check if string is a UUID
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Step 1: Try direct UUID lookup for any UUID identifiers
    for (const identifier of emails) {
      if (isUUID(identifier)) {
        const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(identifier);
        if (!error && user) {
          console.log(`✓ Found user by UUID: ${identifier}`);
          found[identifier] = user;
        }
      }
    }

    // Step 2: Page through all users and match by email, identities, metadata
    let page = 1;
    const perPage = 1000;
    const maxPages = 50;

    while (page <= maxPages && Object.keys(found).length < identifierSet.size) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers failed:", error);
        break;
      }
      
      for (const u of data.users) {
        const candidates: string[] = [];
        
        // Add user ID
        candidates.push(u.id);
        
        // Add primary email
        if (u.email) candidates.push(u.email.toLowerCase());
        
        // Add user_metadata email
        if (u.user_metadata?.email) candidates.push(String(u.user_metadata.email).toLowerCase());
        
        // Add identity emails
        if (u.identities && Array.isArray(u.identities)) {
          for (const identity of u.identities) {
            if (identity.email) candidates.push(identity.email.toLowerCase());
            if (identity.identity_data?.email) candidates.push(String(identity.identity_data.email).toLowerCase());
            if (identity.identity_data?.email_address) candidates.push(String(identity.identity_data.email_address).toLowerCase());
          }
        }
        
        // Check if any candidate matches our search set
        for (const candidate of candidates) {
          if (identifierSet.has(candidate)) {
            console.log(`✓ Found user ${u.id} via identifier: ${candidate}`);
            found[candidate] = u;
          }
        }
      }
      
      if (data.users.length < perPage) break;
      page += 1;
    }

    // Step 3: Fallback - check profiles table for any remaining identifiers
    const stillMissing = emails.filter((e) => !found[e]);
    for (const identifier of stillMissing) {
      if (!isUUID(identifier)) {
        // Try profiles table lookup by email
        const { data: profile, error: profError } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", identifier)
          .single();
        
        if (!profError && profile?.user_id) {
          const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          if (!userError && user) {
            console.log(`✓ Found user ${user.id} via profiles table for: ${identifier}`);
            found[identifier] = user;
          }
        }
      }
    }

    const notFound = emails.filter((e) => !found[e]);

    const deleted: string[] = [];
    const neutralized: string[] = [];
    const skipped: string[] = [...notFound];
    const errors: string[] = [];

    for (const email of emails) {
      const user = found[email];
      if (!user) continue;

      if (dryRun) {
        console.log(`DRY-RUN would delete: ${email}`);
        continue;
      }

      // Remove profile first to prevent FK issues
      if (removeProfiles) {
        const { error: profErr } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("user_id", user.id);
        if (profErr) {
          console.warn(`Failed to delete profile for ${email}:`, profErr.message || profErr);
        }
      }

      const attemptDelete = async (soft: boolean) => {
        // (1) No options
        let { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (!error) return null;

        // (2) Boolean option
        const resBool = await supabaseAdmin.auth.admin.deleteUser(user.id, soft as any);
        if (!resBool.error) return null;

        // (3) Object option
        const resObj = await supabaseAdmin.auth.admin.deleteUser(user.id, { shouldSoftDelete: soft } as any);
        return resObj.error || null;
      };

      let delErr = await attemptDelete(softDelete);
      if (delErr) {
        console.warn(`⚠️ Initial delete failed for ${email} (soft=${softDelete}). Retrying opposite.`, delErr.message || delErr);
        delErr = await attemptDelete(!softDelete);
      }

      if (delErr) {
        // Neutralize fallback - free original email
        const placeholder = `deleted+${Date.now()}+${user.id}@invalid.local`;
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email: placeholder,
          email_confirm: true,
          app_metadata: { deleted: true, force_delete: true },
          ban_duration: "438000h", // ~50 years
        } as any);

        if (updErr) {
          const detail = delErr?.message || JSON.stringify(delErr);
          const updDetail = updErr?.message || JSON.stringify(updErr);
          console.error(`❌ Failed to delete AND neutralize ${email}:`, detail, updDetail);
          errors.push(`${email}: delete_fail=${detail}; update_fail=${updDetail}`);
        } else {
          console.log(`🟡 Neutralized (freed email) for: ${email}`);
          neutralized.push(email);
        }
      } else {
        console.log(`✅ Deleted: ${email}`);
        deleted.push(email);
      }
    }

    const summary = {
      success: errors.length === 0,
      input_count: emails.length,
      matched_count: emails.length - notFound.length,
      deleted,
      deleted_count: deleted.length,
      neutralized,
      neutralized_count: neutralized.length,
      skipped,
      skipped_count: skipped.length,
      errors,
      error_count: errors.length,
    };

    console.log("📝 Force delete summary:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
