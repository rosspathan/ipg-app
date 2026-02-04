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

// Minimum migration amount
const MIN_MIGRATION_BSK = 100;
// Gas estimation for BEP-20 transfer
const ESTIMATED_GAS = 65000n;

interface MigrationRequest {
  action: 'check_eligibility' | 'initiate_migration' | 'get_status';
  amount?: number;
  migration_id?: string;
}

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

    console.log(`[USER-MIGRATE-BSK] User ${user.id} action: ${action}`);

    switch (action) {
      case 'check_eligibility':
        return await checkEligibility(supabase, user.id);
      
      case 'initiate_migration':
        return await initiateMigration(supabase, user.id, body.amount!);
      
      case 'get_status':
        return await getMigrationStatus(supabase, user.id, body.migration_id);
      
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

/**
 * Check if user is eligible for migration
 */
async function checkEligibility(supabase: any, userId: string) {
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
    .select('id, amount_requested, net_amount_migrated, tx_hash, completed_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Estimate gas cost
  let gasEstimateBsk = 0;
  try {
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
    const gasCostBnb = Number(ethers.formatEther(gasPrice * ESTIMATED_GAS));
    const bnbToBsk = 10000; // 1 BNB ≈ 10000 BSK
    gasEstimateBsk = gasCostBnb * bnbToBsk * 1.2; // 20% buffer
  } catch (e) {
    gasEstimateBsk = 5; // Default estimate
  }

  const eligibility = {
    eligible: false,
    reasons: [] as string[],
    wallet_linked: !!walletAddress,
    wallet_address: walletAddress || null,
    kyc_approved: profile.kyc_status === 'approved',
    account_active: profile.account_status === 'active',
    withdrawable_balance: withdrawableBalance,
    min_amount: MIN_MIGRATION_BSK,
    has_pending_migration: hasPending,
    pending_migration: hasPending ? pendingMigrations[0] : null,
    recent_migrations: recentMigrations || [],
    gas_estimate_bsk: Math.ceil(gasEstimateBsk),
  };

  // Determine eligibility
  if (!walletAddress) {
    eligibility.reasons.push('Please link a BSC wallet address first');
  }
  // KYC not required for on-chain migration
  if (profile.account_status !== 'active') {
    eligibility.reasons.push('Account must be active');
  }
  if (withdrawableBalance < MIN_MIGRATION_BSK) {
    eligibility.reasons.push(`Minimum ${MIN_MIGRATION_BSK} BSK required`);
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

/**
 * Initiate a migration request
 */
async function initiateMigration(supabase: any, userId: string, amountBsk: number) {
  // Re-verify eligibility
  const { data: profile } = await supabase
    .from('profiles')
    .select('bsc_wallet_address, wallet_address, kyc_status, account_status')
    .eq('user_id', userId)
    .single();

  if (!profile) throw new Error('Profile not found');

  const walletAddress = profile.bsc_wallet_address || profile.wallet_address;
  if (!walletAddress) throw new Error('No wallet linked');
  // KYC not required for on-chain migration
  if (profile.account_status !== 'active') throw new Error('Account not active');

  // Verify balance
  const { data: balanceData } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const withdrawableBalance = Number(balanceData?.withdrawable_balance || 0);
  if (amountBsk < MIN_MIGRATION_BSK) {
    throw new Error(`Minimum ${MIN_MIGRATION_BSK} BSK required`);
  }
  if (amountBsk > withdrawableBalance) {
    throw new Error('Insufficient balance');
  }

  // Check no pending migrations
  const { data: pending } = await supabase
    .from('bsk_onchain_migrations')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'validating', 'debiting', 'signing', 'broadcasting', 'confirming']);

  if (pending && pending.length > 0) {
    throw new Error('You have a pending migration');
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

  // Estimate gas
  let gasDeductionBsk = 5; // Default
  try {
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
    const gasCostBnb = Number(ethers.formatEther(gasPrice * ESTIMATED_GAS));
    const bnbToBsk = 10000;
    gasDeductionBsk = Math.ceil(gasCostBnb * bnbToBsk * 1.2);
  } catch (e) {
    console.log('[USER-MIGRATE-BSK] Gas estimation failed, using default');
  }

  const netAmount = amountBsk - gasDeductionBsk;
  if (netAmount < 1) {
    throw new Error('Amount too small after gas deduction');
  }

  // Create or get batch for user-initiated migrations
  let batchId: string;
  const { data: existingBatch } = await supabase
    .from('bsk_onchain_migration_batches')
    .select('id')
    .eq('batch_number', 'USER-INITIATED')
    .eq('status', 'active')
    .single();

  if (existingBatch) {
    batchId = existingBatch.id;
  } else {
    const { data: newBatch, error: batchError } = await supabase
      .from('bsk_onchain_migration_batches')
      .insert({
        batch_number: 'USER-INITIATED',
        initiated_by: userId,
        status: 'active',
        total_users: 0,
        total_bsk_requested: 0,
        notes: 'User-initiated migrations'
      })
      .select()
      .single();

    if (batchError) throw batchError;
    batchId = newBatch.id;
  }

  // Create migration record
  const idempotencyKey = `user_migrate_${userId}_${Date.now()}`;
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
      admin_notes: 'User-initiated migration'
    })
    .select()
    .single();

  if (migrationError) throw migrationError;

  console.log(`[USER-MIGRATE-BSK] Created migration ${migration.id} for ${amountBsk} BSK`);

  // Now process the migration immediately
  const result = await processMigration(supabase, migration.id);
  return result;
}

/**
 * Process migration - debit internal, transfer on-chain
 */
async function processMigration(supabase: any, migrationId: string) {
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
  const netAmountBsk = amountBsk - gasDeductionBsk;

  // Step 1: Validate
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'validating', validated_at: new Date().toISOString() })
    .eq('id', migrationId);

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

  // Step 2: Debit internal balance
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'debiting' })
    .eq('id', migrationId);

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
        gas_deduction: gasDeductionBsk
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

  // Step 3: Get migration wallet private key
  const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  if (!privateKey) {
    // Rollback the debit
    await supabase.rpc('record_bsk_transaction', {
      p_user_id: userId,
      p_tx_type: 'credit',
      p_tx_subtype: 'migration_refund',
      p_balance_type: 'withdrawable',
      p_amount_bsk: amountBsk,
      p_idempotency_key: `migrate_refund_${migrationId}`,
      p_meta_json: { migration_id: migrationId, reason: 'wallet_not_configured' }
    });
    await updateMigrationFailed(supabase, migrationId, 'Migration wallet not configured');
    throw new Error('Migration system not configured');
  }

  // Step 4: Sign and broadcast
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'signing', signed_at: new Date().toISOString() })
    .eq('id', migrationId);

  const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, wallet);
  const amountWei = ethers.parseUnits(netAmountBsk.toFixed(8), BSK_DECIMALS);

  // Check hot wallet balance
  const hotWalletBalance = await bskContract.balanceOf(wallet.address);
  if (hotWalletBalance < amountWei) {
    await supabase.rpc('record_bsk_transaction', {
      p_user_id: userId,
      p_tx_type: 'credit',
      p_tx_subtype: 'migration_refund',
      p_balance_type: 'withdrawable',
      p_amount_bsk: amountBsk,
      p_idempotency_key: `migrate_refund_${migrationId}`,
      p_meta_json: { migration_id: migrationId, reason: 'insufficient_hot_wallet' }
    });
    await updateMigrationFailed(supabase, migrationId, 'Insufficient tokens in migration wallet');
    throw new Error('Migration temporarily unavailable');
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'broadcasting', broadcasted_at: new Date().toISOString() })
    .eq('id', migrationId);

  let tx;
  try {
    const feeData = await provider.getFeeData();
    tx = await bskContract.transfer(walletAddress, amountWei, {
      gasLimit: ESTIMATED_GAS,
      gasPrice: feeData.gasPrice
    });
    console.log(`[USER-MIGRATE-BSK] TX sent: ${tx.hash}`);
  } catch (txError: any) {
    await supabase.rpc('record_bsk_transaction', {
      p_user_id: userId,
      p_tx_type: 'credit',
      p_tx_subtype: 'migration_refund',
      p_balance_type: 'withdrawable',
      p_amount_bsk: amountBsk,
      p_idempotency_key: `migrate_refund_${migrationId}`,
      p_meta_json: { migration_id: migrationId, reason: 'tx_failed' }
    });
    await updateMigrationFailed(supabase, migrationId, `Transaction failed: ${txError.message}`);
    throw new Error('Transaction failed');
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({ tx_hash: tx.hash, status: 'confirming' })
    .eq('id', migrationId);

  // Step 5: Wait for confirmation
  const receipt = await tx.wait(1);

  if (!receipt || receipt.status !== 1) {
    await supabase.rpc('record_bsk_transaction', {
      p_user_id: userId,
      p_tx_type: 'credit',
      p_tx_subtype: 'migration_refund',
      p_balance_type: 'withdrawable',
      p_amount_bsk: amountBsk,
      p_idempotency_key: `migrate_refund_${migrationId}`,
      p_meta_json: { migration_id: migrationId, reason: 'tx_reverted' }
    });
    await updateMigrationFailed(supabase, migrationId, 'Transaction reverted on-chain');
    throw new Error('Transaction failed on-chain');
  }

  const actualGasUsed = receipt.gasUsed;
  const feeData = await provider.getFeeData();
  const actualGasCost = actualGasUsed * (feeData.gasPrice || 0n);
  const actualGasCostBnb = Number(ethers.formatEther(actualGasCost));

  // Step 6: Mark completed
  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'completed',
      block_number: receipt.blockNumber,
      gas_used: Number(actualGasUsed),
      actual_gas_cost_bnb: actualGasCostBnb,
      confirmations: 1,
      net_amount_migrated: netAmountBsk,
      confirmed_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })
    .eq('id', migrationId);

  console.log(`[USER-MIGRATE-BSK] Migration ${migrationId} completed: ${netAmountBsk} BSK to ${walletAddress}`);

  return new Response(
    JSON.stringify({
      success: true,
      migration_id: migrationId,
      tx_hash: tx.hash,
      amount_requested: amountBsk,
      gas_deducted: gasDeductionBsk,
      net_amount: netAmountBsk,
      wallet_address: walletAddress,
      block_number: receipt.blockNumber
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

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

/**
 * Get migration status
 */
async function getMigrationStatus(supabase: any, userId: string, migrationId?: string) {
  let query = supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (migrationId) {
    query = query.eq('id', migrationId);
  }

  const { data, error } = await query.limit(10);

  if (error) throw error;

  return new Response(
    JSON.stringify({ migrations: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
