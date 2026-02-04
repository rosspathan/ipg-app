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
const VERSION = '2.1.0';

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
  'WALLET_NOT_CONFIGURED': 'Migration is temporarily unavailable. Please contact support.',
  'PRIVATE_KEY_MISSING': 'Migration is temporarily unavailable. Please contact support.',
  'RPC_DOWN': 'Network connection issue. Please try again in a few minutes.',
  'INSUFFICIENT_BSK': 'Migration is temporarily unavailable due to liquidity. Please try again later.',
  'INSUFFICIENT_BNB': 'Migration is temporarily unavailable due to gas. Please try again later.',
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
    // Return defaults if no settings - but log it
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
// CHECK AVAILABILITY (STRUCTURED REASON CODES)
// ============================================
async function checkAvailability(supabase: any, userId: string): Promise<Response> {
  const settings = await getSettings(supabase);
  const privateKeyConfigured = !!Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  
  let reasonCode: ReasonCode = 'OK';
  let debugDetails: Record<string, any> = {};

  // Check blockers in priority order
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
    // Try fallback
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

  // System is available - balance checks happen on confirm
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
  
  // Check wallet configuration
  const walletAddress = settings.migration_wallet_address;
  const privateKeyConfigured = !!Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  
  const walletConfigured = !!walletAddress && privateKeyConfigured;

  if (!walletAddress) {
    issues.push('Migration wallet address not configured in settings');
  }
  if (!privateKeyConfigured) {
    issues.push('MIGRATION_WALLET_PRIVATE_KEY secret not configured');
  }
  if (!settings.migration_enabled) {
    issues.push('Migration feature is disabled');
  }
  if (settings.maintenance_mode) {
    warnings.push(`Maintenance mode is ON: ${settings.maintenance_message || '(no message)'}`);
  }
  
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
      
      // Verify wallet address matches
      if (walletInstance.address.toLowerCase() !== walletAddress!.toLowerCase()) {
        issues.push(`Private key does not match configured wallet address (key: ${walletInstance.address.slice(0,10)}..., config: ${walletAddress!.slice(0,10)}...)`);
      }
      
      // Check BNB balance
      const bnbBalance = await provider.getBalance(walletInstance.address);
      gasBalanceBnb = Number(ethers.formatEther(bnbBalance));
      
      // Check BSK balance
      const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, provider);
      const bskBalance = await bskContract.balanceOf(walletInstance.address);
      hotWalletBskBalance = Number(ethers.formatUnits(bskBalance, BSK_DECIMALS));
      
      rpcStatus = 'ok';
      rpcLatencyMs = Date.now() - startTime;
      
      // Warnings for low balances (not blockers)
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

  // Get last migration
  const { data: lastMigration } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, tx_hash, completed_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  // System is healthy if there are NO issues (warnings are okay)
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
  
  // Check availability first
  const availabilityResponse = await checkAvailability(supabase, userId);
  const availability = await availabilityResponse.clone().json() as AvailabilityResult;
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('bsc_wallet_address, wallet_address, kyc_status, account_status')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  const walletAddress = profile.bsc_wallet_address || profile.wallet_address;

  // Get BSK balance
  const { data: balanceData } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const withdrawableBalance = Number(balanceData?.withdrawable_balance || 0);

  // Get pending migrations
  const { data: pendingMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, status, amount_requested')
    .eq('user_id', userId)
    .in('status', ['pending', 'validating', 'debiting', 'signing', 'broadcasting', 'confirming']);

  const hasPending = pendingMigrations && pendingMigrations.length > 0;

  // Get recent completed migrations
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
      const bnbToBsk = 10000; // 1 BNB ≈ 10000 BSK
      gasEstimateBsk = Math.ceil(gasCostBnb * bnbToBsk * 1.2); // 20% buffer
    } catch (e) {
      gasEstimateBsk = Number(settings.fixed_gas_fee_bsk);
    }
  }

  // Calculate min valid amount (where net_receive > 0)
  const feeMultiplier = 1 - Number(settings.migration_fee_percent) / 100;
  const minValidAmount = Math.ceil(gasEstimateBsk / feeMultiplier) + 1;

  const eligibility = {
    eligible: false,
    reasons: [] as string[],
    // CRITICAL: system_available should be true when available
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
    has_pending_migration: hasPending,
    pending_migration: hasPending ? pendingMigrations[0] : null,
    recent_migrations: recentMigrations || [],
    gas_estimate_bsk: gasEstimateBsk,
    migration_fee_percent: Number(settings.migration_fee_percent),
    required_confirmations: settings.required_confirmations,
  };

  // Determine eligibility - system blockers first
  if (!availability.available) {
    eligibility.reasons.push(availability.user_message);
  }
  
  // User-specific blockers (show even if system unavailable so user can fix)
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
    eligibility.reasons.push('You have a pending migration');
  }

  // User is eligible only if system is available AND no user blockers
  eligibility.eligible = availability.available && eligibility.reasons.filter(r => 
    r !== availability.user_message
  ).length === 0;

  return new Response(
    JSON.stringify(eligibility),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// INITIATE MIGRATION (IDEMPOTENT)
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

  // Check for existing pending/processing migrations - IDEMPOTENCY CHECK
  const { data: existingMigration } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, status, amount_requested, tx_hash')
    .eq('user_id', userId)
    .in('status', ['pending', 'validating', 'debiting', 'signing', 'broadcasting', 'confirming'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMigration) {
    console.log(`[USER-MIGRATE-BSK] User ${userId} has existing migration ${existingMigration.id}, returning it`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'pending_migration',
        message: 'You have a pending migration. Please wait for it to complete.',
        migration_id: existingMigration.id,
        status: existingMigration.status,
        tx_hash: existingMigration.tx_hash,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // NOW check hot wallet balances (only on confirm, not initial page)
  const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY')!;
  const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
  const walletInstance = new ethers.Wallet(privateKey, provider);
  const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, provider);
  
  // Calculate fees
  const SCALE = 100000000;
  const amountScaled = Math.round(amountBsk * SCALE);
  const feePercent = Number(settings.migration_fee_percent);
  const migrationFeeScaled = Math.ceil(amountScaled * feePercent / 100);
  const migrationFeeBsk = migrationFeeScaled / SCALE;
  
  let gasDeductionBsk = Number(settings.fixed_gas_fee_bsk);
  if (settings.gas_fee_model === 'dynamic') {
    try {
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

  // Check hot wallet has enough BSK
  const hotWalletBsk = await bskContract.balanceOf(walletInstance.address);
  const requiredBsk = ethers.parseUnits(netAmount.toFixed(8), BSK_DECIMALS);
  if (hotWalletBsk < requiredBsk) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'insufficient_bsk',
        message: 'Migration is temporarily unavailable due to liquidity. Please try again later.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check hot wallet has enough BNB for gas
  const bnbBalance = await provider.getBalance(walletInstance.address);
  const minBnb = ethers.parseEther(settings.min_gas_balance_bnb.toString());
  if (bnbBalance < minBnb) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'insufficient_bnb',
        message: 'Migration is temporarily unavailable due to gas. Please try again later.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get ledger sum for audit
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

  // Create a unique batch for this request
  const { data: newBatch, error: batchError } = await supabase
    .from('bsk_onchain_migration_batches')
    .insert({
      batch_number: `USER-${Date.now()}`,
      initiated_by: userId,
      status: 'pending',
      total_users: 1,
      total_bsk_requested: amountBsk,
      notes: 'User-initiated migration'
    })
    .select('id')
    .single();

  if (batchError) {
    console.error('[USER-MIGRATE-BSK] Batch creation error:', batchError);
    throw new Error('Failed to create migration request');
  }
  
  const batchId = newBatch.id;

  // Create migration record
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
      status: 'pending',
      idempotency_key: idempotencyKey,
      gas_deduction_bsk: gasDeductionBsk,
      migration_fee_bsk: migrationFeeBsk,
      migration_fee_percent: feePercent,
      admin_notes: 'User-initiated migration'
    })
    .select()
    .single();

  if (migrationError) {
    console.error('[USER-MIGRATE-BSK] Migration creation error:', migrationError);
    throw new Error('Failed to create migration record');
  }

  console.log(`[USER-MIGRATE-BSK] Created migration ${migration.id} for ${amountBsk} BSK`);

  // Process the migration
  const result = await processMigration(supabase, migration.id, settings);
  return result;
}

// ============================================
// PROCESS MIGRATION (STATE MACHINE)
// ============================================
async function processMigration(supabase: any, migrationId: string, settings: MigrationSettings) {
  const { data: migration, error: migrationError } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('id', migrationId)
    .single();

  if (migrationError || !migration) {
    throw new Error('Migration not found');
  }

  const userId = migration.user_id;
  const walletAddress = migration.wallet_address;
  const amountBsk = Number(migration.amount_requested);
  const gasDeductionBsk = Number(migration.gas_deduction_bsk || 5);
  const migrationFeeBsk = Number(migration.migration_fee_bsk || 0);
  const netAmountBsk = amountBsk - gasDeductionBsk - migrationFeeBsk;

  // ===== STEP 1: VALIDATE =====
  await updateMigrationStatus(supabase, migrationId, 'validating', { validated_at: new Date().toISOString() });

  // Re-check balance
  const { data: currentBalance } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const currentBsk = Number(currentBalance?.withdrawable_balance || 0);
  if (currentBsk < amountBsk) {
    await updateMigrationFailed(supabase, migrationId, `Insufficient balance: ${currentBsk} < ${amountBsk}`);
    throw new Error('Insufficient balance');
  }

  // ===== STEP 2: DEBIT (IDEMPOTENT) =====
  await updateMigrationStatus(supabase, migrationId, 'debiting');

  const debitKey = `migrate_debit_${migrationId}`;
  const { data: debitResult, error: debitError } = await supabase.rpc(
    'record_bsk_transaction',
    {
      p_user_id: userId,
      p_tx_type: 'debit',
      p_tx_subtype: 'onchain_migration',
      p_balance_type: 'withdrawable',
      p_amount_bsk: amountBsk,
      p_idempotency_key: debitKey,
      p_meta_json: {
        migration_id: migrationId,
        wallet_address: walletAddress,
        net_amount: netAmountBsk,
        gas_deduction: gasDeductionBsk,
        migration_fee: migrationFeeBsk
      }
    }
  );

  if (debitError && !debitError.message?.includes('duplicate')) {
    await updateMigrationFailed(supabase, migrationId, `Debit failed: ${debitError.message}`);
    throw new Error(`Debit failed: ${debitError.message}`);
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({
      debited_at: new Date().toISOString(),
      ledger_debit_tx_id: debitResult || debitKey
    })
    .eq('id', migrationId);

  // ===== STEP 3: SIGN =====
  const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  if (!privateKey) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'wallet_not_configured');
    throw new Error('Migration system not configured');
  }

  await updateMigrationStatus(supabase, migrationId, 'signing', { signed_at: new Date().toISOString() });

  const rpcUrl = settings.primary_rpc_url;
  let provider: ethers.JsonRpcProvider;
  
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
  } catch (e: any) {
    if (settings.fallback_rpc_url) {
      try {
        provider = new ethers.JsonRpcProvider(settings.fallback_rpc_url);
      } catch (e2: any) {
        await rollbackMigration(supabase, migrationId, userId, amountBsk, 'rpc_failure');
        throw new Error('RPC connection failed');
      }
    } else {
      await rollbackMigration(supabase, migrationId, userId, amountBsk, 'rpc_failure');
      throw new Error('RPC connection failed');
    }
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, wallet);
  
  const amountWei = ethers.parseUnits(netAmountBsk.toFixed(8), BSK_DECIMALS);

  const hotWalletBalance = await bskContract.balanceOf(wallet.address);
  if (hotWalletBalance < amountWei) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'insufficient_hot_wallet');
    throw new Error('Migration temporarily unavailable');
  }

  // ===== STEP 4: BROADCAST =====
  await updateMigrationStatus(supabase, migrationId, 'broadcasting', { broadcasted_at: new Date().toISOString() });

  let tx: ethers.TransactionResponse;
  try {
    const feeData = await provider.getFeeData();
    const estimatedGas = 65000n;
    
    tx = await bskContract.transfer(walletAddress, amountWei, {
      gasLimit: estimatedGas,
      gasPrice: feeData.gasPrice
    });
    
    console.log(`[USER-MIGRATE-BSK] TX sent: ${tx.hash}`);
    
    await supabase
      .from('bsk_onchain_migrations')
      .update({ tx_hash: tx.hash })
      .eq('id', migrationId);
      
  } catch (txError: any) {
    console.error('[USER-MIGRATE-BSK] TX error:', txError);
    
    if (txError.message?.includes('nonce') || txError.message?.includes('replacement')) {
      await updateMigrationFailed(supabase, migrationId, `Transaction failed: ${txError.message}. Please retry.`);
    } else {
      await rollbackMigration(supabase, migrationId, userId, amountBsk, 'tx_failed');
    }
    throw new Error('Transaction failed');
  }

  // ===== STEP 5: CONFIRM =====
  await updateMigrationStatus(supabase, migrationId, 'confirming');

  const receipt = await tx.wait(settings.required_confirmations);

  if (!receipt || receipt.status !== 1) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'tx_reverted');
    throw new Error('Transaction failed on-chain');
  }

  const actualGasUsed = receipt.gasUsed;
  const feeData = await provider.getFeeData();
  const actualGasCost = actualGasUsed * (feeData.gasPrice || 0n);
  const actualGasCostBnb = Number(ethers.formatEther(actualGasCost));

  // ===== STEP 6: COMPLETE =====
  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'completed',
      error_message: null,
      failed_at: null,
      refunded_at: null,
      block_number: receipt.blockNumber,
      gas_used: Number(actualGasUsed),
      actual_gas_cost_bnb: actualGasCostBnb,
      confirmations: settings.required_confirmations,
      net_amount_migrated: netAmountBsk,
      confirmed_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })
    .eq('id', migrationId);

  await supabase
    .from('bsk_onchain_migration_batches')
    .update({
      status: 'completed',
      successful_users: 1,
      processed_users: 1,
      total_bsk_migrated: netAmountBsk,
      completed_at: new Date().toISOString()
    })
    .eq('id', migration.batch_id);

  console.log(`[USER-MIGRATE-BSK] Migration ${migrationId} completed: ${netAmountBsk} BSK to ${walletAddress}`);

  return new Response(
    JSON.stringify({
      success: true,
      migration_id: migrationId,
      tx_hash: tx.hash,
      amount_requested: amountBsk,
      gas_deducted: gasDeductionBsk,
      migration_fee: migrationFeeBsk,
      net_amount: netAmountBsk,
      wallet_address: walletAddress,
      block_number: receipt.blockNumber,
      confirmations: settings.required_confirmations
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// HELPER: ROLLBACK MIGRATION (REFUND)
// ============================================
async function rollbackMigration(
  supabase: any, 
  migrationId: string, 
  userId: string, 
  amountBsk: number, 
  reason: string
) {
  console.log(`[USER-MIGRATE-BSK] Rolling back migration ${migrationId}: ${reason}`);
  
  const refundKey = `migrate_refund_${migrationId}`;
  const { error: refundError } = await supabase.rpc('record_bsk_transaction', {
    p_user_id: userId,
    p_tx_type: 'credit',
    p_tx_subtype: 'migration_refund',
    p_balance_type: 'withdrawable',
    p_amount_bsk: amountBsk,
    p_idempotency_key: refundKey,
    p_meta_json: { migration_id: migrationId, reason }
  });

  if (refundError && !refundError.message?.includes('duplicate')) {
    console.error('[USER-MIGRATE-BSK] Refund failed:', refundError);
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: `Refund failed: ${refundError.message}. Original failure: ${reason}`,
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    return;
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'rolled_back',
      error_message: reason,
      failed_at: new Date().toISOString(),
      refunded_at: new Date().toISOString(),
      rolled_back_at: new Date().toISOString()
    })
    .eq('id', migrationId);
}

// ============================================
// HELPER: UPDATE STATUS
// ============================================
async function updateMigrationStatus(
  supabase: any, 
  migrationId: string, 
  status: string, 
  extras: Record<string, any> = {}
) {
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status, ...extras })
    .eq('id', migrationId);
}

// ============================================
// HELPER: MARK FAILED
// ============================================
async function updateMigrationFailed(supabase: any, migrationId: string, error: string) {
  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'failed',
      error_message: error,
      failed_at: new Date().toISOString()
    })
    .eq('id', migrationId);
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
