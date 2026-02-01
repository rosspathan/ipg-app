import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BSK Token (BEP-20) Contract ABI - only transfer function needed
const BSK_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const BSK_CONTRACT = '0x742575866C0eb1B6b6350159D536447477085ceF';
const BSK_DECIMALS = 18;

// Gas estimation for BEP-20 transfer (typically ~60000-65000)
const ESTIMATED_GAS = 65000n;

interface MigrationRequest {
  action: 'create_batch' | 'process_migration' | 'retry_failed' | 'get_batch_status' | 'rollback_failed';
  batch_id?: string;
  migration_id?: string;
  user_ids?: string[];
  notes?: string;
}

interface UserForMigration {
  user_id: string;
  wallet_address: string;
  withdrawable_balance: number;
  ledger_sum: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin authentication via ADMIN_WALLETS secret
    const adminWalletsRaw = Deno.env.get('ADMIN_WALLETS')?.trim();
    if (!adminWalletsRaw) {
      throw new Error('ADMIN_WALLETS not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is admin (via JWT from request)
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

    // Check if user's wallet is in admin list
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address, bsc_wallet_address')
      .eq('user_id', user.id)
      .single();

    const userWallet = (profile?.bsc_wallet_address || profile?.wallet_address)?.toLowerCase();
    const adminWallets = adminWalletsRaw.split(',').map(w => w.trim().toLowerCase());
    
    if (!userWallet || !adminWallets.includes(userWallet)) {
      throw new Error('Admin access required');
    }

    const body = await req.json() as MigrationRequest;
    const { action } = body;

    console.log(`[MIGRATE-BSK] Admin ${user.id} executing action: ${action}`);

    switch (action) {
      case 'create_batch':
        return await createMigrationBatch(supabase, user.id, body.user_ids, body.notes);
      
      case 'process_migration':
        return await processMigration(supabase, body.migration_id!);
      
      case 'retry_failed':
        return await retryFailedMigration(supabase, body.migration_id!);
      
      case 'get_batch_status':
        return await getBatchStatus(supabase, body.batch_id!);
      
      case 'rollback_failed':
        return await rollbackFailedMigration(supabase, body.migration_id!);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('[MIGRATE-BSK] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Create a new migration batch with user snapshots
 */
async function createMigrationBatch(
  supabase: any,
  adminId: string,
  userIds?: string[],
  notes?: string
) {
  const MIN_AMOUNT = 100; // Minimum 100 BSK

  // Fetch eligible users with their balances
  let query = supabase
    .from('profiles')
    .select(`
      user_id,
      bsc_wallet_address,
      wallet_address
    `);

  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }

  const { data: profiles, error: profileError } = await query;
  if (profileError) throw profileError;

  // Get BSK balances for these users
  const validUserIds = profiles
    .filter((p: any) => p.bsc_wallet_address || p.wallet_address)
    .map((p: any) => p.user_id);

  if (validUserIds.length === 0) {
    throw new Error('No users with linked wallets found');
  }

  const { data: balances, error: balanceError } = await supabase
    .from('user_bsk_balances')
    .select('user_id, withdrawable_balance')
    .in('user_id', validUserIds)
    .gte('withdrawable_balance', MIN_AMOUNT);

  if (balanceError) throw balanceError;

  if (!balances || balances.length === 0) {
    throw new Error(`No users with >= ${MIN_AMOUNT} BSK withdrawable balance`);
  }

  // Get ledger sums for reconciliation
  const usersForMigration: UserForMigration[] = [];

  for (const balance of balances) {
    const profile = profiles.find((p: any) => p.user_id === balance.user_id);
    if (!profile) continue;

    const walletAddress = profile.bsc_wallet_address || profile.wallet_address;
    if (!walletAddress) continue;

    // Get ledger sum for this user
    const { data: ledgerData } = await supabase
      .from('unified_bsk_ledger')
      .select('amount_bsk, tx_type')
      .eq('user_id', balance.user_id)
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

    usersForMigration.push({
      user_id: balance.user_id,
      wallet_address: walletAddress.toLowerCase(),
      withdrawable_balance: Number(balance.withdrawable_balance),
      ledger_sum: ledgerSum
    });
  }

  if (usersForMigration.length === 0) {
    throw new Error('No eligible users for migration');
  }

  // Create batch
  const batchNumber = `MIGRATE-${Date.now()}`;
  const totalRequested = usersForMigration.reduce((sum, u) => sum + u.withdrawable_balance, 0);

  const { data: batch, error: batchError } = await supabase
    .from('bsk_onchain_migration_batches')
    .insert({
      batch_number: batchNumber,
      initiated_by: adminId,
      status: 'pending',
      total_users: usersForMigration.length,
      total_bsk_requested: totalRequested,
      min_amount_bsk: MIN_AMOUNT,
      notes: notes || null
    })
    .select()
    .single();

  if (batchError) throw batchError;

  // Create individual migration records
  const migrations = usersForMigration.map(user => ({
    batch_id: batch.id,
    user_id: user.user_id,
    wallet_address: user.wallet_address,
    internal_balance_snapshot: user.withdrawable_balance,
    amount_requested: user.withdrawable_balance,
    ledger_sum_at_snapshot: user.ledger_sum,
    balance_matches_ledger: Math.abs(user.withdrawable_balance - user.ledger_sum) < 0.01,
    status: 'pending',
    idempotency_key: `migrate_${batch.id}_${user.user_id}`
  }));

  const { error: migrationError } = await supabase
    .from('bsk_onchain_migrations')
    .insert(migrations);

  if (migrationError) throw migrationError;

  console.log(`[MIGRATE-BSK] Created batch ${batchNumber} with ${usersForMigration.length} users, ${totalRequested} BSK total`);

  return new Response(
    JSON.stringify({
      success: true,
      batch_id: batch.id,
      batch_number: batchNumber,
      total_users: usersForMigration.length,
      total_bsk_requested: totalRequested,
      users: usersForMigration.map(u => ({
        user_id: u.user_id,
        amount: u.withdrawable_balance,
        ledger_matches: Math.abs(u.withdrawable_balance - u.ledger_sum) < 0.01
      }))
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Process a single migration (debit internal, transfer on-chain)
 */
async function processMigration(supabase: any, migrationId: string) {
  // Get migration record
  const { data: migration, error: migrationError } = await supabase
    .from('bsk_onchain_migrations')
    .select('*, batch:bsk_onchain_migration_batches(*)')
    .eq('id', migrationId)
    .single();

  if (migrationError || !migration) {
    throw new Error('Migration not found');
  }

  if (migration.status === 'completed') {
    throw new Error('Migration already completed');
  }

  if (migration.status !== 'pending' && migration.status !== 'failed') {
    throw new Error(`Cannot process migration in status: ${migration.status}`);
  }

  const userId = migration.user_id;
  const walletAddress = migration.wallet_address;
  const amountBsk = Number(migration.amount_requested);

  console.log(`[MIGRATE-BSK] Processing migration ${migrationId} for user ${userId}: ${amountBsk} BSK to ${walletAddress}`);

  // Step 1: Validate - update status
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'validating', validated_at: new Date().toISOString() })
    .eq('id', migrationId);

  // Re-check current balance
  const { data: currentBalance } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const currentBsk = Number(currentBalance?.withdrawable_balance || 0);
  if (currentBsk < amountBsk) {
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: `Insufficient balance: has ${currentBsk}, needs ${amountBsk}`,
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    throw new Error(`Insufficient balance for user ${userId}`);
  }

  // Step 2: Estimate gas and calculate deduction
  const privateKey = Deno.env.get('ADMIN_WALLET_PRIVATE_KEY');
  if (!privateKey) {
    throw new Error('ADMIN_WALLET_PRIVATE_KEY not configured');
  }

  const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
  const gasCostBnb = gasPrice * ESTIMATED_GAS;
  const gasCostBnbFormatted = Number(ethers.formatEther(gasCostBnb));

  // Get BNB/BSK rate to calculate BSK equivalent
  // For simplicity, using a fixed rate - in production, fetch from oracle
  const bnbToBsk = 10000; // 1 BNB = 10000 BSK (example rate)
  const gasDeductionBsk = gasCostBnbFormatted * bnbToBsk * 1.2; // 20% buffer

  const netAmountBsk = amountBsk - gasDeductionBsk;
  if (netAmountBsk < 1) {
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: `Net amount after gas (${netAmountBsk}) too low`,
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    throw new Error('Net amount after gas deduction too low');
  }

  // Step 3: Debit internal balance
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
        batch_id: migration.batch_id,
        wallet_address: walletAddress,
        net_amount: netAmountBsk,
        gas_deduction: gasDeductionBsk
      }
    }
  );

  if (debitError) {
    // Check if idempotency key already used (already debited)
    if (debitError.message?.includes('duplicate')) {
      console.log(`[MIGRATE-BSK] Debit already processed for ${migrationId}`);
    } else {
      await supabase
        .from('bsk_onchain_migrations')
        .update({
          status: 'failed',
          error_message: `Debit failed: ${debitError.message}`,
          failed_at: new Date().toISOString()
        })
        .eq('id', migrationId);
      throw new Error(`Debit failed: ${debitError.message}`);
    }
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({
      debited_at: new Date().toISOString(),
      ledger_debit_tx_id: debitResult || debitKey,
      gas_deduction_bsk: gasDeductionBsk,
      gas_price_gwei: Number(ethers.formatUnits(gasPrice, 'gwei'))
    })
    .eq('id', migrationId);

  // Step 4: Sign and broadcast on-chain transaction
  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'signing', signed_at: new Date().toISOString() })
    .eq('id', migrationId);

  const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, wallet);
  
  // Convert to wei (18 decimals)
  const amountWei = ethers.parseUnits(netAmountBsk.toFixed(8), BSK_DECIMALS);

  // Check hot wallet has enough BSK
  const hotWalletBalance = await bskContract.balanceOf(wallet.address);
  if (hotWalletBalance < amountWei) {
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: `Hot wallet insufficient BSK: has ${ethers.formatUnits(hotWalletBalance, BSK_DECIMALS)}, needs ${netAmountBsk}`,
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    throw new Error('Hot wallet insufficient BSK balance');
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({ status: 'broadcasting', broadcasted_at: new Date().toISOString() })
    .eq('id', migrationId);

  // Execute transfer
  let tx;
  try {
    tx = await bskContract.transfer(walletAddress, amountWei, {
      gasLimit: ESTIMATED_GAS,
      gasPrice: gasPrice
    });
    console.log(`[MIGRATE-BSK] Transaction sent: ${tx.hash}`);
  } catch (txError: any) {
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: `Transaction failed: ${txError.message}`,
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    throw new Error(`Transaction failed: ${txError.message}`);
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({
      tx_hash: tx.hash,
      status: 'confirming'
    })
    .eq('id', migrationId);

  // Step 5: Wait for confirmation
  const receipt = await tx.wait(1); // Wait for 1 confirmation

  if (!receipt || receipt.status !== 1) {
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'failed',
        error_message: 'Transaction reverted on-chain',
        failed_at: new Date().toISOString()
      })
      .eq('id', migrationId);
    throw new Error('Transaction reverted on-chain');
  }

  const actualGasUsed = receipt.gasUsed;
  const actualGasCost = actualGasUsed * gasPrice;
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

  // Update batch stats
  await updateBatchStats(supabase, migration.batch_id);

  console.log(`[MIGRATE-BSK] ✅ Migration ${migrationId} completed: ${netAmountBsk} BSK to ${walletAddress} (tx: ${tx.hash})`);

  return new Response(
    JSON.stringify({
      success: true,
      migration_id: migrationId,
      tx_hash: tx.hash,
      block_number: receipt.blockNumber,
      amount_debited: amountBsk,
      gas_deduction_bsk: gasDeductionBsk,
      net_amount_transferred: netAmountBsk,
      actual_gas_cost_bnb: actualGasCostBnb
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Retry a failed migration
 */
async function retryFailedMigration(supabase: any, migrationId: string) {
  const { data: migration, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('id', migrationId)
    .single();

  if (error || !migration) {
    throw new Error('Migration not found');
  }

  if (migration.status !== 'failed') {
    throw new Error(`Cannot retry migration in status: ${migration.status}`);
  }

  if (migration.retry_count >= migration.max_retries) {
    throw new Error(`Max retries (${migration.max_retries}) exceeded`);
  }

  // Reset to pending with incremented retry count
  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'pending',
      retry_count: migration.retry_count + 1,
      error_message: null,
      failed_at: null
    })
    .eq('id', migrationId);

  // Process again
  return await processMigration(supabase, migrationId);
}

/**
 * Rollback a failed migration (credit back the internal balance)
 */
async function rollbackFailedMigration(supabase: any, migrationId: string) {
  const { data: migration, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('id', migrationId)
    .single();

  if (error || !migration) {
    throw new Error('Migration not found');
  }

  if (migration.status !== 'failed') {
    throw new Error(`Cannot rollback migration in status: ${migration.status}`);
  }

  if (migration.status === 'rolled_back') {
    throw new Error('Migration already rolled back');
  }

  // Only rollback if internal balance was debited but on-chain transfer failed
  if (!migration.debited_at) {
    // Nothing to rollback - debit never happened
    await supabase
      .from('bsk_onchain_migrations')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
        admin_notes: 'No debit occurred - nothing to rollback'
      })
      .eq('id', migrationId);

    return new Response(
      JSON.stringify({ success: true, message: 'No debit occurred - nothing to rollback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Credit back the debited amount
  const rollbackKey = `migrate_rollback_${migrationId}`;
  const { error: creditError } = await supabase.rpc(
    'record_bsk_transaction',
    {
      p_user_id: migration.user_id,
      p_tx_type: 'credit',
      p_tx_subtype: 'migration_rollback',
      p_balance_type: 'withdrawable',
      p_amount_bsk: migration.amount_requested,
      p_idempotency_key: rollbackKey,
      p_meta_json: {
        migration_id: migrationId,
        original_debit_tx: migration.ledger_debit_tx_id,
        reason: 'On-chain transfer failed - balance restored'
      }
    }
  );

  if (creditError && !creditError.message?.includes('duplicate')) {
    throw new Error(`Rollback failed: ${creditError.message}`);
  }

  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString(),
      admin_notes: `Rolled back - credited ${migration.amount_requested} BSK back to user`
    })
    .eq('id', migrationId);

  // Update batch stats
  await updateBatchStats(supabase, migration.batch_id);

  console.log(`[MIGRATE-BSK] Rolled back migration ${migrationId}: ${migration.amount_requested} BSK credited back`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Rolled back ${migration.amount_requested} BSK to user ${migration.user_id}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Get batch status with all migrations
 */
async function getBatchStatus(supabase: any, batchId: string) {
  const { data: batch, error: batchError } = await supabase
    .from('bsk_onchain_migration_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    throw new Error('Batch not found');
  }

  const { data: migrations, error: migrationError } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (migrationError) throw migrationError;

  return new Response(
    JSON.stringify({
      batch,
      migrations,
      summary: {
        pending: migrations?.filter((m: any) => m.status === 'pending').length || 0,
        processing: migrations?.filter((m: any) => ['validating', 'debiting', 'signing', 'broadcasting', 'confirming'].includes(m.status)).length || 0,
        completed: migrations?.filter((m: any) => m.status === 'completed').length || 0,
        failed: migrations?.filter((m: any) => m.status === 'failed').length || 0,
        rolled_back: migrations?.filter((m: any) => m.status === 'rolled_back').length || 0
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Update batch aggregate statistics
 */
async function updateBatchStats(supabase: any, batchId: string) {
  const { data: migrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('status, amount_requested, net_amount_migrated, gas_deduction_bsk, actual_gas_cost_bnb')
    .eq('batch_id', batchId);

  if (!migrations) return;

  const stats = {
    processed_users: migrations.filter((m: any) => m.status !== 'pending').length,
    successful_users: migrations.filter((m: any) => m.status === 'completed').length,
    failed_users: migrations.filter((m: any) => m.status === 'failed').length,
    total_bsk_migrated: migrations
      .filter((m: any) => m.status === 'completed')
      .reduce((sum: number, m: any) => sum + Number(m.net_amount_migrated || 0), 0),
    total_gas_deducted_bsk: migrations
      .filter((m: any) => m.status === 'completed')
      .reduce((sum: number, m: any) => sum + Number(m.gas_deduction_bsk || 0), 0),
    total_gas_spent_bnb: migrations
      .filter((m: any) => m.status === 'completed')
      .reduce((sum: number, m: any) => sum + Number(m.actual_gas_cost_bnb || 0), 0)
  };

  const allDone = migrations.every((m: any) => ['completed', 'failed', 'rolled_back'].includes(m.status));
  const anyFailed = migrations.some((m: any) => m.status === 'failed');

  await supabase
    .from('bsk_onchain_migration_batches')
    .update({
      ...stats,
      status: allDone ? (anyFailed ? 'partial' : 'completed') : 'processing',
      completed_at: allDone ? new Date().toISOString() : null
    })
    .eq('id', batchId);
}
