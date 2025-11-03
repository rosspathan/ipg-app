import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTestUserRequest {
  email: string;
  password: string;
  display_name: string;
  phone?: string;
  kyc_status?: 'none' | 'pending' | 'approved' | 'rejected';
  badge?: string;
  initial_bsk_withdrawable?: number;
  initial_bsk_holding?: number;
  sponsor_email?: string;
  role?: 'user' | 'admin';
}

interface CreateTestUserResponse {
  success: boolean;
  user_id?: string;
  email?: string;
  referral_code?: string;
  badge_assigned?: string | null;
  bsk_balances?: {
    withdrawable: number;
    holding: number;
  };
  referral_tree_setup?: boolean;
  errors?: string[];
  details?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser();
    if (!callingUser) {
      throw new Error('Not authenticated');
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      throw new Error('Only admins can create test users');
    }

    const requestData: CreateTestUserRequest = await req.json();
    const {
      email,
      password,
      display_name,
      phone,
      kyc_status = 'none',
      badge,
      initial_bsk_withdrawable = 0,
      initial_bsk_holding = 0,
      sponsor_email,
      role = 'user',
    } = requestData;

    // Validate required fields
    if (!email || !password || !display_name) {
      throw new Error('Email, password, and display_name are required');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧪 Creating test user:', email);

    const errors: string[] = [];
    let userId: string | undefined;
    let referralCode: string | undefined;
    let badgeAssigned: string | null = null;
    let referralTreeSetup = false;

    // Step 1: Create Auth User
    console.log('1️⃣ Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name,
        phone,
      },
    });

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    userId = authData.user?.id;
    if (!userId) {
      throw new Error('Failed to get user ID from auth creation');
    }

    console.log('✅ Auth user created:', userId);

    // Step 2: Create Profile with referral code
    console.log('2️⃣ Creating profile...');
    referralCode = userId.substring(0, 8).toUpperCase();
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        email,
        username: email.split('@')[0],
        display_name,
        phone,
        account_status: 'active',
        referral_code: referralCode,
      });

    if (profileError) {
      errors.push(`Profile creation: ${profileError.message}`);
    } else {
      console.log('✅ Profile created with referral code:', referralCode);
    }

    // Step 3: Set KYC Status
    if (kyc_status === 'approved') {
      console.log('3️⃣ Setting KYC status to approved...');
      const { error: kycError } = await supabaseAdmin
        .from('kyc_profiles_new')
        .insert({
          user_id: userId,
          full_name: display_name,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: callingUser.id,
        });

      if (kycError) {
        errors.push(`KYC setup: ${kycError.message}`);
      } else {
        console.log('✅ KYC status set to approved');
      }
    }

    // Step 4: Assign Badge
    if (badge) {
      console.log('4️⃣ Assigning badge:', badge);
      
      // Get badge info
      const { data: badgeData } = await supabaseAdmin
        .from('badge_cards_new')
        .select('id, name, cost_bsk')
        .eq('name', badge)
        .single();

      if (badgeData) {
        // Create badge purchase record
        const { error: purchaseError } = await supabaseAdmin
          .from('badge_purchases')
          .insert({
            user_id: userId,
            badge_id: badgeData.id,
            badge_name: badgeData.name,
            cost_bsk: badgeData.cost_bsk,
            payment_method: 'admin_created',
            status: 'completed',
          });

        if (purchaseError) {
          errors.push(`Badge purchase: ${purchaseError.message}`);
        }

        // Create badge holding
        const { error: holdingError } = await supabaseAdmin
          .from('user_badge_holdings')
          .insert({
            user_id: userId,
            badge_id: badgeData.id,
            badge_name: badgeData.name,
            acquired_at: new Date().toISOString(),
          });

        if (holdingError) {
          errors.push(`Badge holding: ${holdingError.message}`);
        } else {
          badgeAssigned = badgeData.name;
          console.log('✅ Badge assigned:', badgeData.name);
        }

        // Create badge purchase event
        await supabaseAdmin
          .from('badge_purchase_events')
          .insert({
            user_id: userId,
            badge_id: badgeData.id,
            badge_name: badgeData.name,
            cost_bsk: badgeData.cost_bsk,
            event_type: 'purchase',
          });
      }
    }

    // Step 5: Setup Referral Tree
    if (sponsor_email) {
      console.log('5️⃣ Setting up referral tree with sponsor:', sponsor_email);
      
      // Find sponsor
      const { data: sponsorProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', sponsor_email)
        .single();

      if (sponsorProfile) {
        // Create referral link
        const { error: linkError } = await supabaseAdmin
          .from('referral_links_new')
          .insert({
            user_id: userId,
            sponsor_id: sponsorProfile.user_id,
            status: 'active',
            linked_at: new Date().toISOString(),
          });

        if (linkError) {
          errors.push(`Referral link: ${linkError.message}`);
        }

        // Get all ancestors of sponsor
        const { data: ancestors } = await supabaseAdmin
          .from('referral_tree')
          .select('ancestor_id, level')
          .eq('user_id', sponsorProfile.user_id)
          .order('level', { ascending: true });

        // Create referral tree entries
        const treeEntries = [];
        
        // Add sponsor as level 1
        treeEntries.push({
          user_id: userId,
          ancestor_id: sponsorProfile.user_id,
          level: 1,
          path: [sponsorProfile.user_id],
        });

        // Add all other ancestors
        if (ancestors) {
          for (const ancestor of ancestors) {
            const newLevel = ancestor.level + 1;
            if (newLevel <= 50) {
              const { data: ancestorPath } = await supabaseAdmin
                .from('referral_tree')
                .select('path')
                .eq('user_id', sponsorProfile.user_id)
                .eq('ancestor_id', ancestor.ancestor_id)
                .single();

              treeEntries.push({
                user_id: userId,
                ancestor_id: ancestor.ancestor_id,
                level: newLevel,
                path: ancestorPath ? [...ancestorPath.path, ancestor.ancestor_id] : [ancestor.ancestor_id],
              });
            }
          }
        }

        const { error: treeError } = await supabaseAdmin
          .from('referral_tree')
          .insert(treeEntries);

        if (treeError) {
          errors.push(`Referral tree: ${treeError.message}`);
        } else {
          referralTreeSetup = true;
          console.log('✅ Referral tree created with', treeEntries.length, 'levels');
        }
      } else {
        errors.push(`Sponsor not found: ${sponsor_email}`);
      }
    }

    // Step 6: Initialize BSK Balances
    if (initial_bsk_withdrawable > 0 || initial_bsk_holding > 0) {
      console.log('6️⃣ Initializing BSK balances...');
      
      const { error: balanceError } = await supabaseAdmin
        .from('user_bsk_balances')
        .insert({
          user_id: userId,
          available_withdrawable: initial_bsk_withdrawable,
          available_holding: initial_bsk_holding,
        });

      if (balanceError) {
        errors.push(`BSK balance: ${balanceError.message}`);
      }

      // Create ledger entries
      if (initial_bsk_withdrawable > 0) {
        await supabaseAdmin
          .from('bsk_withdrawable_ledger')
          .insert({
            user_id: userId,
            amount: initial_bsk_withdrawable,
            transaction_type: 'admin_credit',
            description: 'Initial test user balance',
            metadata: { created_by: callingUser.id, test_user: true },
          });
      }

      if (initial_bsk_holding > 0) {
        await supabaseAdmin
          .from('bsk_holding_ledger')
          .insert({
            user_id: userId,
            amount: initial_bsk_holding,
            transaction_type: 'admin_credit',
            description: 'Initial test user holding balance',
            metadata: { created_by: callingUser.id, test_user: true },
          });
      }

      console.log('✅ BSK balances initialized');
    }

    // Step 7: Create User Role
    console.log('7️⃣ Creating user role...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
      });

    if (roleError) {
      errors.push(`Role creation: ${roleError.message}`);
    } else {
      console.log('✅ Role created:', role);
    }

    // Step 8: Create Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: callingUser.id,
      action: 'create_test_user',
      resource_type: 'user',
      resource_id: userId,
      new_values: {
        email,
        display_name,
        kyc_status,
        badge,
        initial_bsk_withdrawable,
        initial_bsk_holding,
        sponsor_email,
        role,
        timestamp: new Date().toISOString(),
      }
    });

    console.log('✅ Test user creation completed');

    const response: CreateTestUserResponse = {
      success: true,
      user_id: userId,
      email,
      referral_code: referralCode,
      badge_assigned: badgeAssigned,
      bsk_balances: {
        withdrawable: initial_bsk_withdrawable,
        holding: initial_bsk_holding,
      },
      referral_tree_setup: referralTreeSetup,
      errors: errors.length > 0 ? errors : undefined,
      details: `Test user created with ${errors.length} warnings`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('❌ Test user creation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create test user',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
