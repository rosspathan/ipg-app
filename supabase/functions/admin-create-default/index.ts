import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to create admin user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Creating default admin user...');

    // Create default admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@ipg-app.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'IPG Admin',
        role: 'admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      throw adminError;
    }

    let userId = adminUser?.user?.id;

    // If user already exists, get their ID
    if (!userId) {
      const { data: existingUser } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', 'admin@ipg-app.com')
        .single();
      
      userId = existingUser?.id;
    }

    if (userId) {
      // Ensure admin role is assigned
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'admin',
          assigned_by: userId,
          assigned_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      console.log('Admin user created/updated successfully');
    }

    // Also check if rosspathan@gmail.com exists and grant admin
    const { data: rossUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingRoss = rossUser?.users?.find(u => u.email === 'rosspathan@gmail.com');
    
    if (existingRoss) {
      const { error: rossRoleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: existingRoss.id,
          role: 'admin',
          assigned_by: existingRoss.id,
          assigned_at: new Date().toISOString()
        });

      if (rossRoleError) {
        console.error('Ross role assignment error:', rossRoleError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Default admin created',
      adminEmail: 'admin@ipg-app.com',
      adminPassword: 'admin123'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error creating admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);