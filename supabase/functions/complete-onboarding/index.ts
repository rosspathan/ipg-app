import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingRequest {
  email: string;
  walletAddress?: string;
  verificationCode: string;
  storedCode: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, walletAddress, verificationCode, storedCode }: OnboardingRequest = await req.json();

    // Verify the code matches
    if (verificationCode !== storedCode) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      // Create user with admin privileges (auto-confirmed)
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          wallet_address: walletAddress,
          email_verified: true,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create user');

      userId = data.user.id;
      console.log('Created new user:', userId);
    }

    // Extract username from email
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '').substring(0, 20) || `user${userId.substring(0, 6)}`;

    // Update profile with username
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        username,
        email,
        wallet_address: walletAddress,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.warn('Profile update warning:', profileError);
    }

    // Capture referral if pending
    try {
      const { data: pendingReferral } = await supabaseAdmin
        .from('referral_links_new')
        .select('sponsor_id, referral_code, first_touch_at')
        .eq('user_id', userId)
        .is('locked_at', null)
        .maybeSingle();

      if (pendingReferral?.sponsor_id) {
        const { data: settings } = await supabaseAdmin
          .from('mobile_linking_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const shouldLock = settings?.lock_policy === 'email_verified';

        if (shouldLock) {
          await supabaseAdmin
            .from('referral_links_new')
            .update({ locked_at: new Date().toISOString() })
            .eq('user_id', userId);
          
          console.log('Referral locked for user:', userId);
        }
      }
    } catch (err) {
      console.warn('Referral capture warning:', err);
    }

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        username,
        accessToken: sessionData.properties.action_link,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Onboarding completion error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
