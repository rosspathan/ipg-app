import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify user is authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // GET /preview - Return list of orphaned users
    if (req.method === 'GET' || action === 'preview') {
      console.log('📋 Fetching orphaned users preview...');

      // Query for users in auth.users with no matching profile
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      const orphanedUsers: OrphanedUser[] = [];
      
      for (const authUser of authUsers.users) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!profile) {
          orphanedUsers.push({
            id: authUser.id,
            email: authUser.email || 'no-email',
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at
          });
        }
      }

      console.log(`✅ Found ${orphanedUsers.length} orphaned users`);

      return new Response(
        JSON.stringify({
          success: true,
          count: orphanedUsers.length,
          orphaned_users: orphanedUsers
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /cleanup - Delete orphaned users
    if (req.method === 'POST') {
      const body = await req.json();
      const { 
        dry_run = false, 
        max_count = 100,
        whitelist = [],
        soft_delete = true 
      } = body;

      console.log(`🧹 Starting cleanup (dry_run: ${dry_run}, max: ${max_count}, soft_delete: ${soft_delete})`);

      // Query for users in auth.users with no matching profile
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      const orphanedUsers: OrphanedUser[] = [];
      
      for (const authUser of authUsers.users) {
        const email = authUser.email || '';
        // Skip already neutralized records (freed emails)
        const isNeutralized = email.startsWith('deleted+') && email.endsWith('@invalid.local');
        if (isNeutralized) continue;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!profile) {
          orphanedUsers.push({
            id: authUser.id,
            email: authUser.email || 'no-email',
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at
          });
        }
      }

      console.log(`📊 Found ${orphanedUsers.length} orphaned users total`);

      // Apply max_count limit
      const usersToProcess = orphanedUsers.slice(0, max_count);
      
      const deleted: string[] = [];
      const skipped: string[] = [];
      const neutralized: string[] = [];
      const errors: string[] = [];

      for (const orphanedUser of usersToProcess) {
        try {
          // Check whitelist
          if (whitelist.includes(orphanedUser.email)) {
            console.log(`⚠️ Skipping whitelisted email: ${orphanedUser.email}`);
            skipped.push(`${orphanedUser.email} (whitelisted)`);
            continue;
          }

          if (dry_run) {
            console.log(`[DRY RUN] Would delete: ${orphanedUser.email} (${orphanedUser.id})`);
            deleted.push(orphanedUser.email);
          } else {
            // Actually delete from auth.users (soft delete by default, with fallback)
            const attempt = async (soft: boolean) => {
              const { error } = await supabaseAdmin.auth.admin.deleteUser(
                orphanedUser.id,
                { shouldSoftDelete: soft }
              );
              return error as any | null;
            };

            let delErr = await attempt(soft_delete);
            if (delErr) {
              console.warn(`⚠️ Initial delete failed for ${orphanedUser.email} (soft_delete=${soft_delete}). Retrying with ${!soft_delete ? 'soft' : 'hard'} delete...`, delErr);
              delErr = await attempt(!soft_delete);
            }

            if (delErr) {
              // As a last resort, neutralize the account by freeing the email (lets user re-register)
              const placeholderEmail = `deleted+${Date.now()}+${orphanedUser.id}@invalid.local`;
              const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(orphanedUser.id, {
                email: placeholderEmail,
                email_confirm: true,
                app_metadata: { deleted: true, orphan_cleanup: true },
                ban_duration: '438000h' // ~50 years
              } as any);

              if (updateErr) {
                const detail = delErr?.message || JSON.stringify(delErr);
                const updDetail = updateErr?.message || JSON.stringify(updateErr);
                console.error(`❌ Failed to delete AND neutralize ${orphanedUser.email}:`, detail, updDetail);
                errors.push(`${orphanedUser.email}: delete_fail=${detail}; update_fail=${updDetail}`);
              } else {
                console.log(`🟡 Neutralized auth record (freed email) for: ${orphanedUser.email}`);
                neutralized.push(orphanedUser.email);
              }
            } else {
              console.log(`✅ Deleted orphaned user: ${orphanedUser.email}`);
              deleted.push(orphanedUser.email);
            }
          }
        } catch (e: any) {
          console.error(`❌ Exception deleting ${orphanedUser.email}:`, e.message);
          errors.push(`${orphanedUser.email}: ${e.message}`);
        }
      }

      const summary = {
        success: true,
        dry_run,
        total_found: orphanedUsers.length,
        processed: usersToProcess.length,
        deleted: deleted,
        deleted_count: deleted.length,
        neutralized,
        neutralized_count: neutralized.length,
        skipped: skipped,
        skipped_count: skipped.length,
        errors: errors,
        error_count: errors.length
      };

      console.log('📝 Cleanup summary:', JSON.stringify(summary, null, 2));

      return new Response(
        JSON.stringify(summary),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in admin-cleanup-orphaned-users:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
