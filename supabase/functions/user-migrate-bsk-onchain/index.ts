import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BSK Token (BEP-20) Contract
const BSK_CONTRACT = '0x742575866C0eb1B6b6350159D536447477085ceF';
const BSK_DECIMALS = 18;
const BSK_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

// Version for debugging
const VERSION = '3.0.0-admin-approval';

// Reason codes for availability
type ReasonCode = 
  | 'OK'
  | 'MIGRATION_DISABLED'
  | 'MAINTENANCE_MODE'
  | 'WALLET_NOT_CONFIGURED'
  | 'PRIVATE_KEY_MISSING'
  | 'RPC_DOWN'
  | 'INSUFFICIENT_BSK'
  | 'INSUFFICIENT_BNB'
  | 'INTERNAL_ERROR';

interface MigrationRequest {
  action: 'check_eligibility' | 'check_availability' | 'initiate_migration' | 'get_status' | 'get_health';
  amount?: number;
  migration_id?: string;
}

interface MigrationSettings {
  migration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  migration_wallet_address: string | null;
  migration_fee_percent: number;
  gas_fee_model: 'fixed' | 'dynamic';
  fixed_gas_fee_bsk: number;
  min_amount_bsk: number;
  max_amount_bsk: number | null;
  max_per_request_bsk: number | null;
  per_user_daily_limit_bsk: number | null;
  required_confirmations: number;
  primary_rpc_url: string;
  fallback_rpc_url: string | null;
  token_decimals: number;
  min_hot_wallet_bsk: number;
  min_gas_balance_bnb: number;
}

interface AvailabilityResult {
  available: boolean;
  reason_code: ReasonCode;
  user_message: string;
  debug_details?: Record<string, any>;
}

interface HealthStatus {
  healthy: boolean;
  wallet_configured: boolean;
  private_key_configured: boolean;
  wallet_address: string | null;
  migration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  hot_wallet_bsk_balance: number;
  gas_balance_bnb: number;
  rpc_status: 'ok' | 'error';
  rpc_latency_ms: number | null;
  issues: string[];
  warnings: string[];
  last_migration?: { id: string; tx_hash: string | null; completed_at: string | null } | null;
}

// User-friendly messages for each reason code
const REASON_MESSAGES: Record<ReasonCode, string> = {
  'OK': 'Migration is available.',
  'MIGRATION_DISABLED': 'Migration is currently disabled by the administrator.',
  'MAINTENANCE_MODE': 'Migration is under maintenance. Please try again later.',
  'WALLET_NOT_CONFIGURED': 'Our migration system needs configuration. Please try again later or contact support.',
  'PRIVATE_KEY_MISSING': 'Our migration system needs configuration. Please try again later or contact support.',
  'RPC_DOWN': 'Blockchain network connection issue. Please try again in a few minutes.',
  'INSUFFICIENT_BSK': 'Our platform wallet needs more BSK tokens. Please try again later.',
  'INSUFFICIENT_BNB': 'Our platform wallet needs gas for transactions. Please try again later. (You do NOT need BNB)',
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again.',
};

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json() as MigrationRequest;
    const { action } = body;

    console.log(`[USER-MIGRATE-BSK v${VERSION}] User ${user.id} action: ${action}`);

    switch (action) {
      case 'check_availability':
        return await checkAvailability(supabase, user.id);
      
      case 'check_eligibility':
        return await checkEligibility(supabase, user.id);
      
      case 'initiate_migration':
        return await initiateMigration(supabase, user.id, body.amount!);
      
      case 'get_status':
        return await getMigrationStatus(supabase, user.id, body.migration_id);
      
      case 'get_health':
        return await getHealthStatus(supabase);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('[USER-MIGRATE-BSK] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// GET SETTINGS FROM DB
// ============================================
async function getSettings(supabase: any): Promise<MigrationSettings> {
  const { data, error } = await supabase
    .from('bsk_migration_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error || !data) {
    console.warn('[USER-MIGRATE-BSK] No settings found, using defaults');
    return {
      migration_enabled: true,
      maintenance_mode: false,
      maintenance_message: null,
      migration_wallet_address: null,
      migration_fee_percent: 5,
      gas_fee_model: 'dynamic',
      fixed_gas_fee_bsk: 5,
      min_amount_bsk: 100,
      max_amount_bsk: null,
      max_per_request_bsk: null,
      per_user_daily_limit_bsk: null,
      required_confirmations: 3,
      primary_rpc_url: 'https://bsc-dataseed.binance.org',
      fallback_rpc_url: 'https://bsc-dataseed1.binance.org',
      token_decimals: 18,
      min_hot_wallet_bsk: 1000,
      min_gas_balance_bnb: 0.05,
    };
  }
  
  return data;
}

// ============================================
// CHECK AVAILABILITY
// ============================================
async function checkAvailability(supabase: any, userId: string): Promise<Response> {
  const settings = await getSettings(supabase);
  const privateKeyConfigured = !!Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  
  let reasonCode: ReasonCode = 'OK';
  let debugDetails: Record<string, any> = {};

  if (!settings.migration_enabled) {
    reasonCode = 'MIGRATION_DISABLED';
    debugDetails = { migration_enabled: false };
    logUnavailability(userId, reasonCode, settings);
    return createAvailabilityResponse(reasonCode, settings.maintenance_message, debugDetails);
  }

  if (settings.maintenance_mode) {
    reasonCode = 'MAINTENANCE_MODE';
    debugDetails = { maintenance_mode: true };
    logUnavailability(userId, reasonCode, settings);
    return createAvailabilityResponse(reasonCode, settings.maintenance_message, debugDetails);
  }

  if (!settings.migration_wallet_address) {
    reasonCode = 'WALLET_NOT_CONFIGURED';
    debugDetails = { wallet_address: null };
    logUnavailability(userId, reasonCode, settings);
    return createAvailabilityResponse(reasonCode, null, debugDetails);
  }

  if (!privateKeyConfigured) {
    reasonCode = 'PRIVATE_KEY_MISSING';
    debugDetails = { private_key_configured: false };
    logUnavailability(userId, reasonCode, settings);
    return createAvailabilityResponse(reasonCode, null, debugDetails);
  }

  // Check RPC connection
  let rpcOk = false;
  try {
    const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
    await provider.getBlockNumber();
    rpcOk = true;
  } catch (e) {
    if (settings.fallback_rpc_url) {
      try {
        const fallback = new ethers.JsonRpcProvider(settings.fallback_rpc_url);
        await fallback.getBlockNumber();
        rpcOk = true;
      } catch (e2) {
        // Both failed
      }
    }
  }

  if (!rpcOk) {
    reasonCode = 'RPC_DOWN';
    debugDetails = { primary_rpc: settings.primary_rpc_url, fallback_rpc: settings.fallback_rpc_url };
    logUnavailability(userId, reasonCode, settings);
    return createAvailabilityResponse(reasonCode, null, debugDetails);
  }

  return createAvailabilityResponse('OK', null, { 
    migration_enabled: true,
    wallet_configured: true,
    rpc_status: 'ok'
  });
}

function createAvailabilityResponse(
  reasonCode: ReasonCode, 
  customMessage: string | null,
  debugDetails: Record<string, any>
): Response {
  const available = reasonCode === 'OK';
  const userMessage = reasonCode === 'MAINTENANCE_MODE' && customMessage 
    ? customMessage 
    : REASON_MESSAGES[reasonCode];

  const result: AvailabilityResult = {
    available,
    reason_code: reasonCode,
    user_message: userMessage,
    debug_details: debugDetails
  };

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function logUnavailability(userId: string, reasonCode: ReasonCode, settings: MigrationSettings) {
  console.log(`[USER-MIGRATE-BSK] Unavailable - user: ${userId}, reason: ${reasonCode}, config: ${JSON.stringify({
    migration_enabled: settings.migration_enabled,
    maintenance_mode: settings.maintenance_mode,
    wallet_configured: !!settings.migration_wallet_address,
    timestamp: new Date().toISOString()
  })}`);
}

// ============================================
// GET HEALTH STATUS (ADMIN)
// ============================================
async function getHealthStatus(supabase: any): Promise<Response> {
  const settings = await getSettings(supabase);
  const issues: string[] = [];
  const warnings: string[] = [];
  
  const walletAddress = settings.migration_wallet_address;
  const privateKeyConfigured = !!Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  const walletConfigured = !!walletAddress && privateKeyConfigured;

  if (!walletAddress) issues.push('Migration wallet address not configured in settings');
  if (!privateKeyConfigured) issues.push('MIGRATION_WALLET_PRIVATE_KEY secret not configured');
  if (!settings.migration_enabled) issues.push('Migration feature is disabled');
  if (settings.maintenance_mode) warnings.push(`Maintenance mode is ON: ${settings.maintenance_message || '(no message)'}`);
  
  let hotWalletBskBalance = 0;
  let gasBalanceBnb = 0;
  let rpcStatus: 'ok' | 'error' = 'error';
  let rpcLatencyMs: number | null = null;
  
  if (walletConfigured) {
    try {
      const startTime = Date.now();
      const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
      const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY')!;
      const walletInstance = new ethers.Wallet(privateKey, provider);
      
      if (walletInstance.address.toLowerCase() !== walletAddress!.toLowerCase()) {
        issues.push(`Private key does not match configured wallet address`);
      }
      
      const bnbBalance = await provider.getBalance(walletInstance.address);
      gasBalanceBnb = Number(ethers.formatEther(bnbBalance));
      
      const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, provider);
      const bskBalance = await bskContract.balanceOf(walletInstance.address);
      hotWalletBskBalance = Number(ethers.formatUnits(bskBalance, BSK_DECIMALS));
      
      rpcStatus = 'ok';
      rpcLatencyMs = Date.now() - startTime;
      
      if (gasBalanceBnb < Number(settings.min_gas_balance_bnb)) {
        warnings.push(`Low gas balance: ${gasBalanceBnb.toFixed(4)} BNB (min: ${settings.min_gas_balance_bnb})`);
      }
      if (hotWalletBskBalance < Number(settings.min_hot_wallet_bsk)) {
        warnings.push(`Low BSK balance: ${hotWalletBskBalance.toFixed(2)} BSK (min: ${settings.min_hot_wallet_bsk})`);
      }
    } catch (e: any) {
      console.error('[USER-MIGRATE-BSK] Health check RPC error:', e.message);
      issues.push(`RPC connection failed: ${e.message}`);
    }
  }

  const { data: lastMigration } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, tx_hash, completed_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const health: HealthStatus = {
    healthy: issues.length === 0,
    wallet_configured: !!walletAddress,
    private_key_configured: privateKeyConfigured,
    wallet_address: walletAddress || null,
    migration_enabled: settings.migration_enabled,
    maintenance_mode: settings.maintenance_mode,
    maintenance_message: settings.maintenance_message,
    hot_wallet_bsk_balance: hotWalletBskBalance,
    gas_balance_bnb: gasBalanceBnb,
    rpc_status: rpcStatus,
    rpc_latency_ms: rpcLatencyMs,
    issues,
    warnings,
    last_migration: lastMigration || null,
  };
  
  return new Response(
    JSON.stringify(health),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// CHECK ELIGIBILITY
// ============================================
async function checkEligibility(supabase: any, userId: string) {
  const settings = await getSettings(supabase);
  
  const availabilityResponse = await checkAvailability(supabase, userId);
  const availability = await availabilityResponse.clone().json() as AvailabilityResult;
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('bsc_wallet_address, wallet_address, kyc_status, account_status')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  const walletAddress = profile.bsc_wallet_address || profile.wallet_address;

  const { data: balanceData } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const withdrawableBalance = Number(balanceData?.withdrawable_balance || 0);

  // Check for any pending migrations (including PENDING_ADMIN_APPROVAL)
  const { data: pendingMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, status, amount_requested')
    .eq('user_id', userId)
    .in('status', ['pending_admin_approval', 'approved_executing', 'pending', 'validating', 'debiting', 'signing', 'broadcasting', 'confirming']);

  const hasPending = pendingMigrations && pendingMigrations.length > 0;

  const { data: recentMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, amount_requested, net_amount_migrated, migration_fee_bsk, gas_deduction_bsk, tx_hash, completed_at, status, error_message')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Estimate gas cost using settings
  let gasEstimateBsk = Number(settings.fixed_gas_fee_bsk);
  if (settings.gas_fee_model === 'dynamic' && availability.available) {
    try {
      const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
      const estimatedGas = 65000n;
      const gasCostBnb = Number(ethers.formatEther(gasPrice * estimatedGas));
      const bnbToBsk = 10000;
      gasEstimateBsk = Math.ceil(gasCostBnb * bnbToBsk * 1.2);
    } catch (e) {
      gasEstimateBsk = Number(settings.fixed_gas_fee_bsk);
    }
  }

  const feeMultiplier = 1 - Number(settings.migration_fee_percent) / 100;
  const minValidAmount = Math.ceil(gasEstimateBsk / feeMultiplier) + 1;

  // Calculate daily total for user
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('amount_requested')
    .eq('user_id', userId)
    .in('status', ['pending_admin_approval', 'approved_executing', 'completed'])
    .gte('created_at', `${today}T00:00:00Z`);

  const dailyTotal = (todayMigrations || []).reduce((sum: number, m: any) => sum + Number(m.amount_requested), 0);

  const maxPerRequest = settings.max_per_request_bsk ? Number(settings.max_per_request_bsk) : null;
  const perUserDailyLimit = settings.per_user_daily_limit_bsk ? Number(settings.per_user_daily_limit_bsk) : null;

  const eligibility = {
    eligible: false,
    reasons: [] as string[],
    system_available: availability.available,
    system_reason_code: availability.reason_code,
    system_message: availability.user_message,
    wallet_linked: !!walletAddress,
    wallet_address: walletAddress || null,
    kyc_approved: profile.kyc_status === 'approved',
    account_active: profile.account_status === 'active',
    withdrawable_balance: withdrawableBalance,
    min_amount: Math.max(Number(settings.min_amount_bsk), minValidAmount),
    max_amount: settings.max_amount_bsk ? Math.min(Number(settings.max_amount_bsk), withdrawableBalance) : withdrawableBalance,
    max_per_request: maxPerRequest,
    per_user_daily_limit: perUserDailyLimit,
    daily_total: dailyTotal,
    has_pending_migration: hasPending,
    pending_migration: hasPending ? pendingMigrations[0] : null,
    recent_migrations: recentMigrations || [],
    gas_estimate_bsk: gasEstimateBsk,
    migration_fee_percent: Number(settings.migration_fee_percent),
    required_confirmations: settings.required_confirmations,
    approval_required: true, // NEW: always admin approval
  };

  if (!availability.available) {
    eligibility.reasons.push(availability.user_message);
  }
  if (!walletAddress) {
    eligibility.reasons.push('Please link a BSC wallet address first');
  }
  if (profile.account_status !== 'active') {
    eligibility.reasons.push('Account must be active');
  }
  if (withdrawableBalance < eligibility.min_amount) {
    eligibility.reasons.push(`Minimum ${eligibility.min_amount} BSK required`);
  }
  if (hasPending) {
    eligibility.reasons.push('You have a pending migration request');
  }
  if (maxPerRequest && withdrawableBalance > 0) {
    eligibility.max_amount = Math.min(eligibility.max_amount, maxPerRequest);
  }
  if (perUserDailyLimit && dailyTotal >= perUserDailyLimit) {
    eligibility.reasons.push(`Daily migration limit reached (${perUserDailyLimit} BSK)`);
  }

  eligibility.eligible = availability.available && eligibility.reasons.filter(r => 
    r !== availability.user_message
  ).length === 0;

  return new Response(
    JSON.stringify(eligibility),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// INITIATE MIGRATION — REQUEST ONLY (NO DEBIT, NO BROADCAST)
// Status: PENDING_ADMIN_APPROVAL
// ============================================
async function initiateMigration(supabase: any, userId: string, amountBsk: number) {
  const settings = await getSettings(supabase);
  
  // Check availability first
  const availabilityResponse = await checkAvailability(supabase, userId);
  const availability = await availabilityResponse.clone().json() as AvailabilityResult;
  
  if (!availability.available) {
    logUnavailability(userId, availability.reason_code, settings);
    return new Response(
      JSON.stringify({
        success: false,
        error: availability.reason_code.toLowerCase(),
        message: availability.user_message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Re-verify eligibility
  const { data: profile } = await supabase
    .from('profiles')
    .select('bsc_wallet_address, wallet_address, kyc_status, account_status')
    .eq('user_id', userId)
    .single();

  if (!profile) throw new Error('Profile not found');

  const walletAddress = profile.bsc_wallet_address || profile.wallet_address;
  if (!walletAddress) throw new Error('No wallet linked');
  if (profile.account_status !== 'active') throw new Error('Account not active');

  // Verify balance
  const { data: balanceData } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const withdrawableBalance = Number(balanceData?.withdrawable_balance || 0);
  if (amountBsk < Number(settings.min_amount_bsk)) {
    throw new Error(`Minimum ${settings.min_amount_bsk} BSK required`);
  }
  if (amountBsk > withdrawableBalance) {
    throw new Error('Insufficient balance');
  }

  // Check max per request
  if (settings.max_per_request_bsk && amountBsk > Number(settings.max_per_request_bsk)) {
    throw new Error(`Maximum ${settings.max_per_request_bsk} BSK per request`);
  }

  // Check daily limit
  if (settings.per_user_daily_limit_bsk) {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMigrations } = await supabase
      .from('bsk_onchain_migrations')
      .select('amount_requested')
      .eq('user_id', userId)
      .in('status', ['pending_admin_approval', 'approved_executing', 'completed'])
      .gte('created_at', `${today}T00:00:00Z`);

    const dailyTotal = (todayMigrations || []).reduce((sum: number, m: any) => sum + Number(m.amount_requested), 0);
    if (dailyTotal + amountBsk > Number(settings.per_user_daily_limit_bsk)) {
      throw new Error(`Daily migration limit would be exceeded (${settings.per_user_daily_limit_bsk} BSK)`);
    }
  }

  // Check for existing pending/processing migrations - IDEMPOTENCY CHECK
  const { data: existingMigration } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, status, amount_requested, tx_hash')
    .eq('user_id', userId)
    .in('status', ['pending_admin_approval', 'approved_executing', 'pending', 'validating', 'debiting', 'signing', 'broadcasting', 'confirming'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMigration) {
    console.log(`[USER-MIGRATE-BSK] User ${userId} has existing migration ${existingMigration.id}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'pending_migration',
        message: 'You have a pending migration request. Please wait for admin review.',
        migration_id: existingMigration.id,
        status: existingMigration.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate fees (for display, NO debit yet)
  const SCALE = 100000000;
  const amountScaled = Math.round(amountBsk * SCALE);
  const feePercent = Number(settings.migration_fee_percent);
  const migrationFeeScaled = Math.ceil(amountScaled * feePercent / 100);
  const migrationFeeBsk = migrationFeeScaled / SCALE;
  
  let gasDeductionBsk = Number(settings.fixed_gas_fee_bsk);
  if (settings.gas_fee_model === 'dynamic') {
    try {
      const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
      const estimatedGas = 65000n;
      const gasCostBnb = Number(ethers.formatEther(gasPrice * estimatedGas));
      const bnbToBsk = 10000;
      gasDeductionBsk = Math.ceil(gasCostBnb * bnbToBsk * 1.2);
    } catch (e) {
      console.log('[USER-MIGRATE-BSK] Gas estimation failed, using fixed');
    }
  }

  const netAmount = amountBsk - gasDeductionBsk - migrationFeeBsk;
  if (netAmount <= 0) {
    throw new Error('Amount too small after fees and gas deduction');
  }

  // Get ledger sum for audit snapshot
  const { data: ledgerData } = await supabase
    .from('unified_bsk_ledger')
    .select('amount_bsk, tx_type')
    .eq('user_id', userId)
    .eq('balance_type', 'withdrawable')
    .eq('status', 'completed');

  let ledgerSum = 0;
  if (ledgerData) {
    ledgerData.forEach((entry: any) => {
      if (entry.tx_type === 'credit') {
        ledgerSum += Number(entry.amount_bsk);
      } else if (entry.tx_type === 'debit') {
        ledgerSum -= Number(entry.amount_bsk);
      }
    });
  }

  // Create batch
  const { data: newBatch, error: batchError } = await supabase
    .from('bsk_onchain_migration_batches')
    .insert({
      batch_number: `USER-${Date.now()}`,
      initiated_by: userId,
      status: 'pending_approval',
      total_users: 1,
      total_bsk_requested: amountBsk,
      notes: 'User-initiated migration (pending admin approval)'
    })
    .select('id')
    .single();

  if (batchError) {
    console.error('[USER-MIGRATE-BSK] Batch creation error:', batchError);
    throw new Error('Failed to create migration request');
  }
  
  const batchId = newBatch.id;

  // Create migration record — STATUS: PENDING_ADMIN_APPROVAL
  // NO balance debit at this stage
  const idempotencyKey = `user_migrate_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const { data: migration, error: migrationError } = await supabase
    .from('bsk_onchain_migrations')
    .insert({
      batch_id: batchId,
      user_id: userId,
      wallet_address: walletAddress.toLowerCase(),
      internal_balance_snapshot: withdrawableBalance,
      amount_requested: amountBsk,
      ledger_sum_at_snapshot: ledgerSum,
      balance_matches_ledger: Math.abs(withdrawableBalance - ledgerSum) < 0.01,
      status: 'pending_admin_approval',
      idempotency_key: idempotencyKey,
      gas_deduction_bsk: gasDeductionBsk,
      migration_fee_bsk: migrationFeeBsk,
      migration_fee_percent: feePercent,
      admin_notes: 'Awaiting admin approval',
      // Admin approval fields — null until reviewed
      approved_by: null,
      approved_at: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      admin_approval_note: null,
    })
    .select()
    .single();

  if (migrationError) {
    console.error('[USER-MIGRATE-BSK] Migration creation error:', migrationError);
    throw new Error('Failed to create migration request');
  }

  console.log(`[USER-MIGRATE-BSK v${VERSION}] Created PENDING migration ${migration.id} for ${amountBsk} BSK — awaiting admin approval`);

  // Return success — but migration is NOT executed yet
  return new Response(
    JSON.stringify({
      success: true,
      migration_id: migration.id,
      status: 'pending_admin_approval',
      message: 'Your migration request has been submitted and is awaiting admin approval.',
      amount_requested: amountBsk,
      estimated_fee: migrationFeeBsk,
      estimated_gas_deduction: gasDeductionBsk,
      estimated_net_amount: netAmount,
      wallet_address: walletAddress,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// GET MIGRATION STATUS
// ============================================
async function getMigrationStatus(supabase: any, userId: string, migrationId?: string) {
  let query = supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (migrationId) {
    query = query.eq('id', migrationId);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  return new Response(
    JSON.stringify({ migrations: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
