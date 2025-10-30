import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  userId: string;
  badgeName: string;
  requiredAmount: number;
}

interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  userBalance: number;
  requiredAmount: number;
  shortfall: number;
  alreadyOwned: boolean;
  kycCompleted: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, badgeName, requiredAmount }: ValidationRequest = await req.json();

    console.log('Validating badge purchase:', { userId, badgeName, requiredAmount });

    const errors: string[] = [];
    const warnings: string[] = [];
    let userBalance = 0;
    let alreadyOwned = false;
    let kycCompleted = false;

    // 1. Check user's BSK balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      errors.push('Unable to verify your balance. Please try again.');
    } else {
      userBalance = balanceData?.withdrawable_balance || 0;
      
      if (userBalance < requiredAmount) {
        const shortfall = requiredAmount - userBalance;
        errors.push(`Insufficient balance. You need ${shortfall.toLocaleString()} more BSK.`);
      }
    }

    // 2. Check if user already owns this badge
    const { data: holdingData, error: holdingError } = await supabase
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', userId)
      .eq('current_badge', badgeName)
      .maybeSingle();

    if (holdingError) {
      console.error('Error checking badge ownership:', holdingError);
      warnings.push('Unable to verify badge ownership.');
    } else if (holdingData) {
      alreadyOwned = true;
      errors.push('You already own this badge.');
    }

    // 3. Check KYC status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('kyc_verified')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking KYC:', profileError);
      warnings.push('Unable to verify KYC status.');
    } else {
      kycCompleted = profileData?.kyc_verified || false;
      
      if (!kycCompleted) {
        errors.push('KYC verification required. Please complete verification first.');
      }
    }

    const shortfall = Math.max(0, requiredAmount - userBalance);
    const valid = errors.length === 0;

    const response: ValidationResponse = {
      valid,
      errors,
      warnings,
      userBalance,
      requiredAmount,
      shortfall,
      alreadyOwned,
      kycCompleted,
    };

    console.log('Validation result:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Validation error:', error);
    
    return new Response(
      JSON.stringify({ 
        valid: false,
        errors: ['Validation failed. Please try again.'],
        warnings: [],
        userBalance: 0,
        requiredAmount: 0,
        shortfall: 0,
        alreadyOwned: false,
        kycCompleted: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
