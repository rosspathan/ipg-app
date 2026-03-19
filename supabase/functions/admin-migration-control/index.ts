import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSK_CONTRACT = '0x742575866C0eb1B6b6350159D536447477085ceF';
const BSK_DECIMALS = 18;
const BSK_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

const VERSION = '1.0.0';

interface AdminAction {
  action: 'approve' | 'reject' | 'get_pending' | 'get_migration_detail';
  migration_id?: string;
  rejection_reason?: string;
  admin_note?: string;
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

    // Authenticate admin
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify admin role server-side
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error(`[ADMIN-MIGRATION] Non-admin access attempt by ${user.id}`);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json() as AdminAction;
    console.log(`[ADMIN-MIGRATION v${VERSION}] Admin ${user.id} action: ${body.action}`);

    switch (body.action) {
      case 'approve':
        return await approveMigration(supabase, user.id, body.migration_id!, body.admin_note);

      case 'reject':
        return await rejectMigration(supabase, user.id, body.migration_id!, body.rejection_reason!, body.admin_note);

      case 'get_pending':
        return await getPendingMigrations(supabase);

      case 'get_migration_detail':
        return await getMigrationDetail(supabase, body.migration_id!);

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

  } catch (error: any) {
    console.error('[ADMIN-MIGRATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// GET PENDING MIGRATIONS (with user details)
// ============================================
async function getPendingMigrations(supabase: any): Promise<Response> {
  const { data: migrations, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('status', 'pending_admin_approval')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Enrich with user details
  const enriched = [];
  for (const m of (migrations || [])) {
    const detail = await getUserMigrationDetail(supabase, m);
    enriched.push(detail);
  }

  return new Response(
    JSON.stringify({ pending: enriched }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// GET MIGRATION DETAIL
// ============================================
async function getMigrationDetail(supabase: any, migrationId: string): Promise<Response> {
  const { data: migration, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('id', migrationId)
    .single();

  if (error || !migration) throw new Error('Migration not found');

  const detail = await getUserMigrationDetail(supabase, migration);

  return new Response(
    JSON.stringify(detail),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserMigrationDetail(supabase: any, migration: any) {
  const userId = migration.user_id;

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, email, bsc_wallet_address, wallet_address, account_status, kyc_status, created_at')
    .eq('user_id', userId)
    .single();

  // Get current balance
  const { data: balance } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance, holding_balance')
    .eq('user_id', userId)
    .single();

  // Get lifetime migration total
  const { data: lifetimeMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('amount_requested, status')
    .eq('user_id', userId)
    .eq('status', 'completed');

  const totalLifetimeMigrated = (lifetimeMigrations || []).reduce(
    (sum: number, m: any) => sum + Number(m.amount_requested), 0
  );

  // Get today's migration total
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMigrations } = await supabase
    .from('bsk_onchain_migrations')
    .select('amount_requested')
    .eq('user_id', userId)
    .in('status', ['pending_admin_approval', 'approved_executing', 'completed'])
    .gte('created_at', `${today}T00:00:00Z`);

  const dailyMigrationTotal = (todayMigrations || []).reduce(
    (sum: number, m: any) => sum + Number(m.amount_requested), 0
  );

  // Get last 20 ledger entries
  const { data: recentLedger } = await supabase
    .from('unified_bsk_ledger')
    .select('id, tx_type, tx_subtype, amount_bsk, balance_type, status, created_at, notes, idempotency_key')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get ledger sum for reconciliation
  const { data: ledgerData } = await supabase
    .from('unified_bsk_ledger')
    .select('amount_bsk, tx_type')
    .eq('user_id', userId)
    .eq('balance_type', 'withdrawable')
    .eq('status', 'completed');

  let currentLedgerSum = 0;
  if (ledgerData) {
    ledgerData.forEach((entry: any) => {
      if (entry.tx_type === 'credit') currentLedgerSum += Number(entry.amount_bsk);
      else if (entry.tx_type === 'debit') currentLedgerSum -= Number(entry.amount_bsk);
    });
  }

  const currentBalance = Number(balance?.withdrawable_balance || 0);
  const balanceMatchesLedger = Math.abs(currentBalance - currentLedgerSum) < 0.01;

  // Check for suspicious patterns
  const suspiciousFlags: string[] = [];
  if (!balanceMatchesLedger) suspiciousFlags.push('Balance/ledger mismatch');
  if (Number(migration.amount_requested) > currentBalance) suspiciousFlags.push('Requested amount exceeds current balance');
  if (dailyMigrationTotal > 10000) suspiciousFlags.push('High daily migration volume');
  if (totalLifetimeMigrated > 100000) suspiciousFlags.push('Very high lifetime migration total');

  // Get login info
  const { data: loginLogs } = await supabase
    .from('login_logs')
    .select('ip_address, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...migration,
    // User info
    username: profile?.username || 'Unknown',
    email: profile?.email || 'Unknown',
    account_status: profile?.account_status,
    kyc_status: profile?.kyc_status,
    account_created_at: profile?.created_at,
    // Balance info
    current_withdrawable_balance: currentBalance,
    current_holding_balance: Number(balance?.holding_balance || 0),
    current_ledger_sum: currentLedgerSum,
    balance_matches_ledger_now: balanceMatchesLedger,
    // Migration stats
    total_lifetime_migrated: totalLifetimeMigrated,
    daily_migration_total: dailyMigrationTotal,
    // Security
    last_login_ip: loginLogs?.ip_address || null,
    suspicious_activity_flags: suspiciousFlags,
    // Ledger
    recent_ledger_entries: recentLedger || [],
  };
}

// ============================================
// REJECT MIGRATION
// ============================================
async function rejectMigration(
  supabase: any,
  adminId: string,
  migrationId: string,
  rejectionReason: string,
  adminNote?: string
): Promise<Response> {
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new Error('Rejection reason is mandatory');
  }

  // Verify migration is in PENDING_ADMIN_APPROVAL
  const { data: migration, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('id, status, user_id, amount_requested')
    .eq('id', migrationId)
    .single();

  if (error || !migration) throw new Error('Migration not found');
  if (migration.status !== 'pending_admin_approval') {
    throw new Error(`Cannot reject migration in status: ${migration.status}`);
  }

  // Update migration — NO balance modification
  const { error: updateError } = await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'rejected',
      rejected_by: adminId,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
      admin_approval_note: adminNote?.trim() || null,
      admin_notes: `Rejected by admin: ${rejectionReason.trim()}`,
    })
    .eq('id', migrationId);

  if (updateError) throw new Error(`Failed to reject: ${updateError.message}`);

  // Update batch
  await supabase
    .from('bsk_onchain_migration_batches')
    .update({ status: 'rejected' })
    .eq('id', migration.batch_id);

  // Log admin action
  await supabase.from('admin_actions_log').insert({
    admin_user_id: adminId,
    action_type: 'migration_rejected',
    target_table: 'bsk_onchain_migrations',
    target_id: migrationId,
    details: {
      user_id: migration.user_id,
      amount_requested: migration.amount_requested,
      rejection_reason: rejectionReason.trim(),
      admin_note: adminNote?.trim() || null,
    }
  });

  console.log(`[ADMIN-MIGRATION] Migration ${migrationId} REJECTED by admin ${adminId}: ${rejectionReason}`);

  return new Response(
    JSON.stringify({ success: true, status: 'rejected', migration_id: migrationId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// APPROVE AND EXECUTE MIGRATION
// ============================================
async function approveMigration(
  supabase: any,
  adminId: string,
  migrationId: string,
  adminNote?: string
): Promise<Response> {
  // Verify migration is in PENDING_ADMIN_APPROVAL
  const { data: migration, error } = await supabase
    .from('bsk_onchain_migrations')
    .select('*')
    .eq('id', migrationId)
    .single();

  if (error || !migration) throw new Error('Migration not found');
  if (migration.status !== 'pending_admin_approval') {
    throw new Error(`Cannot approve migration in status: ${migration.status}`);
  }

  const userId = migration.user_id;
  const amountBsk = Number(migration.amount_requested);
  const walletAddress = migration.wallet_address;
  const gasDeductionBsk = Number(migration.gas_deduction_bsk || 5);
  const migrationFeeBsk = Number(migration.migration_fee_bsk || 0);
  const netAmountBsk = amountBsk - gasDeductionBsk - migrationFeeBsk;

  // Mark as APPROVED_EXECUTING
  await supabase
    .from('bsk_onchain_migrations')
    .update({
      status: 'approved_executing',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      admin_approval_note: adminNote?.trim() || null,
    })
    .eq('id', migrationId);

  // Log admin action
  await supabase.from('admin_actions_log').insert({
    admin_user_id: adminId,
    action_type: 'migration_approved',
    target_table: 'bsk_onchain_migrations',
    target_id: migrationId,
    details: {
      user_id: userId,
      amount_requested: amountBsk,
      net_amount: netAmountBsk,
      admin_note: adminNote?.trim() || null,
    }
  });

  // ===== STEP 1: RE-CHECK BALANCE =====
  const { data: currentBalance } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .eq('user_id', userId)
    .single();

  const currentBsk = Number(currentBalance?.withdrawable_balance || 0);
  if (currentBsk < amountBsk) {
    await supabase.from('bsk_onchain_migrations').update({
      status: 'failed',
      error_message: `Insufficient balance at execution: ${currentBsk} < ${amountBsk}`,
      failed_at: new Date().toISOString(),
    }).eq('id', migrationId);

    console.error(`[ADMIN-MIGRATION] Migration ${migrationId} FAILED: insufficient balance ${currentBsk} < ${amountBsk}`);
    return new Response(
      JSON.stringify({ success: false, error: 'insufficient_balance', message: `User balance insufficient: ${currentBsk} BSK available, ${amountBsk} BSK requested` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 2: DEBIT (IDEMPOTENT) =====
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
        migration_fee: migrationFeeBsk,
        approved_by: adminId,
      }
    }
  );

  if (debitError && !debitError.message?.includes('duplicate')) {
    await supabase.from('bsk_onchain_migrations').update({
      status: 'failed',
      error_message: `Debit failed: ${debitError.message}`,
      failed_at: new Date().toISOString(),
    }).eq('id', migrationId);

    console.error(`[ADMIN-MIGRATION] Migration ${migrationId} debit FAILED: ${debitError.message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'debit_failed', message: debitError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await supabase.from('bsk_onchain_migrations').update({
    debited_at: new Date().toISOString(),
    ledger_debit_tx_id: debitResult || debitKey,
  }).eq('id', migrationId);

  // ===== STEP 3: SIGN =====
  const privateKey = Deno.env.get('MIGRATION_WALLET_PRIVATE_KEY');
  if (!privateKey) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'wallet_not_configured');
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_not_configured', message: 'Migration wallet private key not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get settings for RPC
  const { data: settings } = await supabase.from('bsk_migration_settings').select('*').limit(1).single();
  const rpcUrl = settings?.primary_rpc_url || 'https://bsc-dataseed.binance.org';
  const fallbackRpc = settings?.fallback_rpc_url || 'https://bsc-dataseed1.binance.org';
  const requiredConfirmations = settings?.required_confirmations || 3;

  let provider: any;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getBlockNumber(); // health check
  } catch (e) {
    try {
      provider = new ethers.JsonRpcProvider(fallbackRpc);
      await provider.getBlockNumber();
    } catch (e2) {
      await rollbackMigration(supabase, migrationId, userId, amountBsk, 'rpc_failure');
      return new Response(
        JSON.stringify({ success: false, error: 'rpc_failure', message: 'Blockchain RPC unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const bskContract = new ethers.Contract(BSK_CONTRACT, BSK_ABI, wallet);

  const amountWei = ethers.parseUnits(netAmountBsk.toFixed(8), BSK_DECIMALS);

  // Check hot wallet balance
  const hotWalletBalance = await bskContract.balanceOf(wallet.address);
  if (hotWalletBalance < amountWei) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'insufficient_hot_wallet');
    return new Response(
      JSON.stringify({ success: false, error: 'insufficient_hot_wallet', message: 'Hot wallet has insufficient BSK' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 4: BROADCAST =====
  await supabase.from('bsk_onchain_migrations').update({
    status: 'broadcasting',
    signed_at: new Date().toISOString(),
    broadcasted_at: new Date().toISOString(),
  }).eq('id', migrationId);

  let tx: ethers.TransactionResponse;
  try {
    const feeData = await provider.getFeeData();
    const estimatedGas = 65000n;

    tx = await bskContract.transfer(walletAddress, amountWei, {
      gasLimit: estimatedGas,
      gasPrice: feeData.gasPrice,
    });

    console.log(`[ADMIN-MIGRATION] TX sent: ${tx.hash} for migration ${migrationId}`);

    await supabase.from('bsk_onchain_migrations').update({ tx_hash: tx.hash }).eq('id', migrationId);

  } catch (txError: any) {
    console.error('[ADMIN-MIGRATION] TX error:', txError);

    if (txError.message?.includes('nonce') || txError.message?.includes('replacement')) {
      await supabase.from('bsk_onchain_migrations').update({
        status: 'failed',
        error_message: `Transaction failed: ${txError.message}`,
        failed_at: new Date().toISOString(),
      }).eq('id', migrationId);
    } else {
      await rollbackMigration(supabase, migrationId, userId, amountBsk, `tx_failed: ${txError.message}`);
    }

    return new Response(
      JSON.stringify({ success: false, error: 'tx_failed', message: txError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 5: CONFIRM =====
  await supabase.from('bsk_onchain_migrations').update({ status: 'confirming' }).eq('id', migrationId);

  const receipt = await tx.wait(requiredConfirmations);

  if (!receipt || receipt.status !== 1) {
    await rollbackMigration(supabase, migrationId, userId, amountBsk, 'tx_reverted');
    return new Response(
      JSON.stringify({ success: false, error: 'tx_reverted', message: 'Transaction reverted on-chain' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const actualGasUsed = receipt.gasUsed;
  const feeData = await provider.getFeeData();
  const actualGasCost = actualGasUsed * (feeData.gasPrice || 0n);
  const actualGasCostBnb = Number(ethers.formatEther(actualGasCost));

  // ===== STEP 6: COMPLETE =====
  await supabase.from('bsk_onchain_migrations').update({
    status: 'completed',
    error_message: null,
    failed_at: null,
    refunded_at: null,
    block_number: receipt.blockNumber,
    gas_used: Number(actualGasUsed),
    actual_gas_cost_bnb: actualGasCostBnb,
    confirmations: requiredConfirmations,
    net_amount_migrated: netAmountBsk,
    confirmed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq('id', migrationId);

  await supabase.from('bsk_onchain_migration_batches').update({
    status: 'completed',
    successful_users: 1,
    processed_users: 1,
    total_bsk_migrated: netAmountBsk,
    completed_at: new Date().toISOString(),
  }).eq('id', migration.batch_id);

  console.log(`[ADMIN-MIGRATION] Migration ${migrationId} COMPLETED: ${netAmountBsk} BSK to ${walletAddress} (tx: ${tx.hash})`);

  return new Response(
    JSON.stringify({
      success: true,
      status: 'completed',
      migration_id: migrationId,
      tx_hash: tx.hash,
      amount_requested: amountBsk,
      net_amount_migrated: netAmountBsk,
      block_number: receipt.blockNumber,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// ROLLBACK MIGRATION (REFUND)
// ============================================
async function rollbackMigration(
  supabase: any,
  migrationId: string,
  userId: string,
  amountBsk: number,
  reason: string
) {
  console.log(`[ADMIN-MIGRATION] Rolling back migration ${migrationId}: ${reason}`);

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
    console.error('[ADMIN-MIGRATION] Refund failed:', refundError);
    await supabase.from('bsk_onchain_migrations').update({
      status: 'failed',
      error_message: `Refund failed: ${refundError.message}. Original failure: ${reason}`,
      failed_at: new Date().toISOString(),
    }).eq('id', migrationId);
    return;
  }

  await supabase.from('bsk_onchain_migrations').update({
    status: 'rolled_back',
    error_message: reason,
    failed_at: new Date().toISOString(),
    refunded_at: new Date().toISOString(),
    rolled_back_at: new Date().toISOString(),
  }).eq('id', migrationId);
}
