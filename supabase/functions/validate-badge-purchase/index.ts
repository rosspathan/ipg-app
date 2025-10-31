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
    let totalAvailableBalance = 0;
    let alreadyOwned = false;
    let kycCompleted = false;
    let currentBadgeName: string | null = null;
    let expectedAmount = requiredAmount;

    // 1. Check user's BSK balance (withdrawable + holding)
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      errors.push('Unable to verify your balance. Please try again.');
    } else {
      const withdrawable = balanceData?.withdrawable_balance || 0;
      const holding = balanceData?.holding_balance || 0;
      totalAvailableBalance = withdrawable + holding;
      userBalance = withdrawable; // Legacy field for compatibility
      
      console.log(`Balance check: withdrawable=${withdrawable}, holding=${holding}, total=${totalAvailableBalance}`);
    }

    // 1b. Get current badge to validate amount
    const { data: currentBadgeData } = await supabase
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', userId)
      .maybeSingle();
    
    currentBadgeName = currentBadgeData?.current_badge || null;
    console.log(`Current badge: ${currentBadgeName || 'None'}`);

    // 1c. Validate requiredAmount against badge_thresholds
    const { data: targetBadge } = await supabase
      .from('badge_thresholds')
      .select('bsk_threshold')
      .eq('badge_name', badgeName)
      .maybeSingle();

    if (targetBadge) {
      let expectedDiff = targetBadge.bsk_threshold;
      
      // If upgrading, calculate the difference
      if (currentBadgeName && currentBadgeName !== 'NONE') {
        const { data: currentBadge } = await supabase
          .from('badge_thresholds')
          .select('bsk_threshold')
          .eq('badge_name', currentBadgeName)
          .maybeSingle();
        
        if (currentBadge) {
          expectedDiff = Math.max(0, targetBadge.bsk_threshold - currentBadge.bsk_threshold);
        }
      }
      
      expectedAmount = expectedDiff;
      console.log(`Amount validation: expected=${expectedAmount}, provided=${requiredAmount}`);
      
      // Allow some tolerance for rounding
      if (Math.abs(requiredAmount - expectedAmount) > 0.01) {
        warnings.push(`Amount mismatch detected. Expected ${expectedAmount} BSK, got ${requiredAmount} BSK. Using server value.`);
      }
    }

    // Check balance against expected amount
    if (totalAvailableBalance < expectedAmount) {
      const shortfall = expectedAmount - totalAvailableBalance;
      errors.push(`Insufficient balance. You need ${shortfall.toLocaleString()} more BSK.`);
      console.log(`Insufficient balance: need ${expectedAmount}, have ${totalAvailableBalance}, shortfall ${shortfall}`);
    }

    // 2. Check if user already owns this badge
    if (currentBadgeName && currentBadgeName.toUpperCase() === badgeName.toUpperCase()) {
      alreadyOwned = true;
      errors.push('You already own this badge.');
      console.log(`Already owned: ${badgeName}`);
    }

    // 3. Check KYC status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_kyc_approved, kyc_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking KYC:', profileError);
      warnings.push('Unable to verify KYC status.');
    } else {
      // User is KYC completed if is_kyc_approved is true OR kyc_status is 'approved'
      kycCompleted = (profileData?.is_kyc_approved === true) || (profileData?.kyc_status === 'approved');
      
      if (!kycCompleted) {
        errors.push('KYC verification required. Please complete verification first.');
      }
    }

    const shortfall = Math.max(0, expectedAmount - totalAvailableBalance);
    const valid = errors.length === 0;

    const response: ValidationResponse = {
      valid,
      errors,
      warnings,
      userBalance: totalAvailableBalance,
      requiredAmount: expectedAmount,
      shortfall,
      alreadyOwned,
      kycCompleted,
    };

    console.log('Validation result:', { valid, errors, warnings, totalAvailableBalance, expectedAmount, shortfall, alreadyOwned, kycCompleted });

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
