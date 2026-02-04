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
const VERSION = '2.0.0';

interface MigrationRequest {
  action: 'check_eligibility' | 'initiate_migration' | 'get_status' | 'get_health';
  amount?: number;
  migration_id?: string;
}

interface MigrationSettings {
  migration_enabled: boolean;
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

interface HealthStatus {
  healthy: boolean;
  wallet_configured: boolean;
  wallet_address: string | null;
  migration_enabled: boolean;
  hot_wallet_bsk_balance: number;
  gas_balance_bnb: number;
  rpc_status: 'ok' | 'error';
  issues: string[];
}

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
    // Return defaults if no settings
    return {
      migration_enabled: true,
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
// GET HEALTH STATUS
// ============================================
async function getHealthStatus(supabase: any): Promise<Response> {
  const settings = await getSettings(supabase);
  const issues: string[] = [];
  
  // Check if migration wallet is configured
  const { data: wallet } = await supabase
    .from('platform_hot_wallet')
    .select('address')
    .eq('label', 'Migration Hot Wallet')
    .eq('is_active', true)
    .maybeSingle();
  
  const walletConfigured = !!wallet?.address;
  const privateKeyConfigured = !!Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  
  if (!walletConfigured) {
    issues.push('Migration wallet address not configured in database');
  }
  if (!privateKeyConfigured) {
    issues.push('MIGRATION_WALLET_PRIVATE_KEY secret not configured');
  }
  if (!settings.migration_enabled) {
    issues.push('Migration feature is disabled by admin');
  }
  
  let hotWalletBskBalance = 0;
  let gasBalanceBnb = 0;
  let rpcStatus: 'ok' | 'error' = 'error';
  
  if (walletConfigured && privateKeyConfigured) {
    try {
      const provider = new ethers.JsonRpcProvider(settings.primary_rpc_url);
      const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY')!;
      const walletInstance = new ethers.Wallet(privateKey, provider);
      
      // Verify wallet address matches
      if (walletInstance.address.toLowerCase() !== wallet.address.toLowerCase()) {
        issues.push('Private key does not match configured wallet address');
      }
      
      // Check BNB balance
      const bnbBalance = await provider.getBalance(walletInstance.address);
      gasBalanceBnb = Number(ethers.formatEther(bnbBalance));
      
      // Check BSK balance
      const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, provider);
      const bskBalance = await bskContract.balanceOf(walletInstance.address);
      hotWalletBskBalance = Number(ethers.formatUnits(bskBalance, BSK_DECIMALS));
      
      rpcStatus = 'ok';
      
      if (gasBalanceBnb < Number(settings.min_gas_balance_bnb)) {
        issues.push(`Low gas balance: ${gasBalanceBnb.toFixed(4)} BNB (min: ${settings.min_gas_balance_bnb})`);
      }
      if (hotWalletBskBalance < Number(settings.min_hot_wallet_bsk)) {
        issues.push(`Low BSK balance: ${hotWalletBskBalance.toFixed(2)} BSK (min: ${settings.min_hot_wallet_bsk})`);
      }
    } catch (e: any) {
      console.error('[USER-MIGRATE-BSK] Health check RPC error:', e.message);
      issues.push(`RPC connection failed: ${e.message}`);
    }
  }
  
  const health: HealthStatus = {
    healthy: issues.length === 0,
    wallet_configured: walletConfigured && privateKeyConfigured,
    wallet_address: wallet?.address || null,
    migration_enabled: settings.migration_enabled,
    hot_wallet_bsk_balance: hotWalletBskBalance,
    gas_balance_bnb: gasBalanceBnb,
    rpc_status: rpcStatus,
    issues,
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
  
  // Check system health first
  const healthResponse = await getHealthStatus(supabase);
  const health = await healthResponse.json() as HealthStatus;
  
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
  if (settings.gas_fee_model === 'dynamic' && health.rpc_status === 'ok') {
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

  // Calculate max valid amount (where net_receive > 0)
  // net = amount - (amount * fee_percent / 100) - gas
  // net > 0 => amount - amount * fee_percent / 100 > gas
  // amount * (1 - fee_percent / 100) > gas
  // amount > gas / (1 - fee_percent / 100)
  const feeMultiplier = 1 - Number(settings.migration_fee_percent) / 100;
  const minValidAmount = Math.ceil(gasEstimateBsk / feeMultiplier) + 1;

  const eligibility = {
    eligible: false,
    reasons: [] as string[],
    system_available: health.healthy,
    system_issues: health.issues,
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

  // Determine eligibility
  if (!health.healthy) {
    eligibility.reasons.push('Migration temporarily unavailable. Please try later.');
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
    eligibility.reasons.push('You have a pending migration');
  }

  eligibility.eligible = eligibility.reasons.length === 0;

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
  
  // Check system health first
  const healthResponse = await getHealthStatus(supabase);
  const health = await healthResponse.json() as HealthStatus;
  
  if (!health.healthy) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'system_unavailable',
        message: 'Migration temporarily unavailable. Please try later.',
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
    // Return the existing migration - idempotent behavior
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

  // Calculate fees using integer math (scaled by 8 decimals)
  const SCALE = 100000000; // 10^8 for precision
  const amountScaled = Math.round(amountBsk * SCALE);
  const feePercent = Number(settings.migration_fee_percent);
  const migrationFeeScaled = Math.ceil(amountScaled * feePercent / 100);
  const migrationFeeBsk = migrationFeeScaled / SCALE;
  
  // Estimate gas
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

  // Create migration record with unique idempotency key
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
    // Rollback
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'wallet_not_configured');
    throw new Error('Migration system not configured');
  }

  await updateMigrationStatus(supabase, migrationId, 'signing', { signed_at: new Date().toISOString() });

  const rpcUrl = settings.primary_rpc_url;
  let provider: ethers.JsonRpcProvider;
  
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
  } catch (e: any) {
    // Try fallback RPC
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
  
  // Use integer math for amount (wei)
  const amountWei = ethers.parseUnits(netAmountBsk.toFixed(8), BSK_DECIMALS);

  // Check hot wallet balance
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
    
    // Save tx hash immediately
    await supabase
      .from('bsk_onchain_migrations')
      .update({ tx_hash: tx.hash })
      .eq('id', migrationId);
      
  } catch (txError: any) {
    console.error('[USER-MIGRATE-BSK] TX error:', txError);
    
    // Check if this is a nonce issue or other recoverable error
    if (txError.message?.includes('nonce') || txError.message?.includes('replacement')) {
      await updateMigrationFailed(supabase, migrationId, `Transaction failed: ${txError.message}. Please retry.`);
      // Don't refund - let admin investigate
    } else {
      await rollbackMigration(supabase, migrationId, userId, amountBsk, 'tx_failed');
    }
    throw new Error('Transaction failed');
  }

  // ===== STEP 5: CONFIRM =====
  await updateMigrationStatus(supabase, migrationId, 'confirming');

  const receipt = await tx.wait(settings.required_confirmations);

  if (!receipt || receipt.status !== 1) {
    // TX reverted on-chain - this is rare after broadcast
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

  // Update batch
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
  
  // Credit back the amount
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
    // Mark as failed but not refunded - needs admin intervention
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

  // Mark migration as refunded
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
