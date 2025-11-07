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

    console.log(`🚨 Force delete requested for ${emails.length} email(s). dry_run=${dryRun}, soft_delete=${softDelete}`);

    // Fetch users in pages and index by email
    const emailSet = new Set(emails);
    const found: Record<string, any> = {};

    let page = 1;
    const perPage = 1000;
    // Limit total pages to avoid infinite loops (adjust as needed)
    const maxPages = 50;

    while (page <= maxPages && Object.keys(found).length < emailSet.size) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listUsers failed:", error);
        break;
      }
      for (const u of data.users) {
        const email = (u.email || "").toLowerCase();
        if (emailSet.has(email)) {
          found[email] = u;
        }
      }
      if (data.users.length < perPage) break; // last page
      page += 1;
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
