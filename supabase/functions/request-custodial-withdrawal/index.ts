/**
 * Request Custodial Withdrawal Edge Function
 * 
 * Called by users to request a withdrawal from their trading balance.
 * Uses atomic RPC with FOR UPDATE row locking to prevent race conditions.
 * 
 * NEW: On-chain hot wallet liquidity validation before accepting.
 * The actual on-chain transfer is handled by process-custodial-withdrawal.
 * 
 * IMPORTANT: All error responses use HTTP 200 with success:false so the
 * frontend SDK can always read the structured error body.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, details?: Record<string, any>) {
  // Always 200 so supabase.functions.invoke() can read the body
  return jsonResponse({ success: false, error, ...details });
}

interface WithdrawalRequest {
  asset_symbol: string;
  amount: number;
}

// BSC RPC endpoints for on-chain balance checks
const BSC_RPC_URLS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
];

// ERC20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = '0x70a08231';

// Minimum gas reserve to keep in hot wallet (BNB)
const MIN_GAS_RESERVE_BNB = 0.01;

async function rpcCall(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

async function tryRpc(method: string, params: any[]): Promise<any> {
  for (const url of BSC_RPC_URLS) {
    try { return await rpcCall(url, method, params); } catch { continue; }
  }
  throw new Error('All BSC RPC endpoints failed');
}

async function getOnChainTokenBalance(contractAddress: string, walletAddress: string): Promise<bigint> {
  const paddedAddr = '0x000000000000000000000000' + walletAddress.slice(2).toLowerCase();
  const data = BALANCE_OF_SELECTOR + paddedAddr.slice(2);
  const result = await tryRpc('eth_call', [
    { to: contractAddress, data },
    'latest',
  ]);
  return BigInt(result || '0x0');
}

async function getBnbBalance(walletAddress: string): Promise<bigint> {
  const result = await tryRpc('eth_getBalance', [walletAddress, 'latest']);
  return BigInt(result || '0x0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', { reason: 'missing_auth' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('Invalid authentication. Please log in again.', { reason: 'auth_failed' });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: WithdrawalRequest = await req.json();
    const { asset_symbol, amount } = body;

    console.log(`[request-custodial-withdrawal] User ${user.id} requesting ${amount} ${asset_symbol}`);

    // Validate inputs
    if (!asset_symbol || !amount || amount <= 0) {
      return errorResponse('Invalid request parameters. Amount must be positive.', { reason: 'invalid_params' });
    }

    // Get asset
    const { data: asset, error: assetError } = await adminClient
      .from('assets')
      .select('id, symbol, contract_address, decimals, withdraw_enabled, min_withdraw_amount, max_withdraw_amount, withdraw_fee')
      .eq('symbol', asset_symbol)
      .eq('is_active', true)
      .single();

    if (assetError || !asset) {
      return errorResponse(`Asset ${asset_symbol} not found or inactive.`, { reason: 'asset_not_found' });
    }

    if (!asset.withdraw_enabled) {
      return errorResponse(`Withdrawals are currently disabled for ${asset_symbol}.`, { reason: 'withdrawals_disabled' });
    }

    if (asset.min_withdraw_amount && amount < asset.min_withdraw_amount) {
      return errorResponse(`Minimum withdrawal is ${asset.min_withdraw_amount} ${asset_symbol}.`, { reason: 'below_minimum' });
    }

    if (asset.max_withdraw_amount && amount > asset.max_withdraw_amount) {
      return errorResponse(`Maximum withdrawal is ${asset.max_withdraw_amount} ${asset_symbol}.`, { reason: 'above_maximum' });
    }

    // ═══════════════════════════════════════════════════
    // CIRCUIT BREAKER CHECK
    // ═══════════════════════════════════════════════════
    const { data: cbRow } = await adminClient
      .from('withdrawal_circuit_breaker')
      .select('is_frozen')
      .eq('asset_symbol', asset_symbol)
      .eq('is_frozen', true)
      .maybeSingle();

    if (cbRow?.is_frozen) {
      console.warn(`[request-custodial-withdrawal] Circuit breaker FROZEN for ${asset_symbol}`);
      return errorResponse(`Withdrawals for ${asset_symbol} are temporarily frozen for safety. Please try again later.`, { reason: 'circuit_breaker' });
    }

    // ═══════════════════════════════════════════════════
    // ON-CHAIN HOT WALLET LIQUIDITY VALIDATION
    // ═══════════════════════════════════════════════════
    const { data: hotWallet } = await adminClient
      .from('platform_hot_wallet')
      .select('address')
      .eq('is_active', true)
      .eq('chain', 'BSC')
      .eq('label', 'Trading Hot Wallet')
      .maybeSingle();

    let liquidityStatus: 'sufficient' | 'awaiting_liquidity' | 'unknown' = 'unknown';
    let onChainBalance = 0;
    let pendingOutbound = 0;
    let availableLiquidity = 0;

    if (hotWallet?.address && asset.contract_address) {
      try {
        // 1. Get real on-chain token balance
        const rawBalance = await getOnChainTokenBalance(asset.contract_address, hotWallet.address);
        const decimals = asset.decimals || 18;
        onChainBalance = Number(rawBalance) / Math.pow(10, decimals);

        // 2. Get pending outbound obligations
        const { data: pendingData } = await adminClient
          .from('custodial_withdrawals')
          .select('amount')
          .eq('status', 'pending')
          .in('asset_id', [asset.id]);

        pendingOutbound = (pendingData || []).reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);

        // 3. Calculate available liquidity
        availableLiquidity = onChainBalance - pendingOutbound;

        // 4. Check BNB gas reserve
        const bnbBalance = await getBnbBalance(hotWallet.address);
        const bnbNum = Number(bnbBalance) / 1e18;
        const hasGas = bnbNum >= MIN_GAS_RESERVE_BNB;

        console.log(`[request-custodial-withdrawal] Liquidity check: on-chain=${onChainBalance.toFixed(4)} ${asset_symbol}, pending=${pendingOutbound.toFixed(4)}, available=${availableLiquidity.toFixed(4)}, gas=${bnbNum.toFixed(4)} BNB`);

        if (!hasGas) {
          liquidityStatus = 'awaiting_liquidity';
          console.warn(`[request-custodial-withdrawal] Insufficient gas: ${bnbNum.toFixed(6)} BNB < ${MIN_GAS_RESERVE_BNB}`);
        } else if (availableLiquidity < amount) {
          liquidityStatus = 'awaiting_liquidity';
          console.warn(`[request-custodial-withdrawal] Insufficient liquidity: ${availableLiquidity.toFixed(4)} < ${amount} ${asset_symbol}`);
        } else {
          liquidityStatus = 'sufficient';
        }
      } catch (rpcErr: any) {
        console.error(`[request-custodial-withdrawal] RPC liquidity check FAILED — blocking submission:`, rpcErr?.message);
        return errorResponse(
          `Unable to verify hot wallet liquidity for ${asset_symbol}. Please try again in a few minutes.`,
          { reason: 'rpc_unavailable' }
        );
      }
    }

    // SECURITY: Always derive destination from the user's registered wallet — never from request body
    let destinationAddress: string | null = null;

    const { data: profile } = await adminClient
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', user.id)
      .single();

    destinationAddress = profile?.bsc_wallet_address || profile?.wallet_address || null;

    if (!destinationAddress) {
      const { data: userWallet } = await adminClient
        .from('wallets_user')
        .select('address')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      destinationAddress = userWallet?.address || null;
    }

    if (!destinationAddress) {
      return errorResponse('No withdrawal address found. Please set up your wallet first.', { reason: 'no_wallet' });
    }

    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid withdrawal address format.', { reason: 'invalid_address' });
    }

    console.log(`[request-custodial-withdrawal] Destination: ${destinationAddress}`);

    // Withdrawal Address Whitelist — check if address is allowlisted and activated
    const { data: allowlistEntries, error: allowlistError } = await adminClient
      .from('allowlist_addresses')
      .select('id, address, enabled, activated_at, activation_delay_hours, created_at')
      .eq('user_id', user.id)
      .eq('chain', 'BSC')
      .eq('enabled', true);

    if (allowlistError) {
      console.error('[request-custodial-withdrawal] Allowlist check error:', allowlistError);
    }

    if (allowlistEntries && allowlistEntries.length > 0) {
      const matchedEntry = allowlistEntries.find(
        (e) => e.address.toLowerCase() === destinationAddress!.toLowerCase()
      );

      if (!matchedEntry) {
        return errorResponse('Withdrawal address is not in your allowlist. Add it first and wait for activation.', { reason: 'not_allowlisted' });
      }

      const activatedAt = matchedEntry.activated_at ? new Date(matchedEntry.activated_at) : null;
      const delayHours = matchedEntry.activation_delay_hours ?? 24;

      if (!activatedAt) {
        await adminClient
          .from('allowlist_addresses')
          .update({ activated_at: new Date().toISOString() })
          .eq('id', matchedEntry.id);

        return errorResponse(`New address requires a ${delayHours}-hour cooling-off period before withdrawals. Please try again later.`, { reason: 'cooling_off' });
      }

      const activationThreshold = new Date(activatedAt.getTime() + delayHours * 60 * 60 * 1000);
      if (new Date() < activationThreshold) {
        const remainingMs = activationThreshold.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return errorResponse(`Address is still in cooling-off period. ${remainingHours}h remaining.`, { reason: 'cooling_off_active' });
      }

      console.log(`[request-custodial-withdrawal] ✓ Address passed allowlist + activation check`);
    }

    const fee = asset.withdraw_fee || 0;

    // Execute atomic withdrawal with FOR UPDATE row locking
    const { data: result, error: rpcError } = await adminClient.rpc(
      'execute_withdrawal_request',
      {
        p_user_id: user.id,
        p_asset_id: asset.id,
        p_amount: amount,
        p_fee: fee,
        p_to_address: destinationAddress,
      }
    );

    if (rpcError) {
      console.error('[request-custodial-withdrawal] RPC error:', rpcError);
      return errorResponse(
        rpcError.message || 'Withdrawal processing failed. Please try again.',
        { reason: 'rpc_error', code: rpcError.code }
      );
    }

    if (!result?.success) {
      console.error('[request-custodial-withdrawal] Rejected:', result?.error);
      return errorResponse(result?.error || 'Withdrawal failed.', { reason: 'validation_failed' });
    }

    console.log(`[request-custodial-withdrawal] ✓ Created withdrawal ${result.withdrawal_id} (liquidity: ${liquidityStatus})`);

    // Determine user-facing status detail based on liquidity
    let statusDetail = 'Queued for hot wallet processing';
    let userMessage = 'Withdrawal request submitted. It will be processed shortly.';

    if (liquidityStatus === 'awaiting_liquidity') {
      statusDetail = 'Awaiting hot wallet liquidity';
      userMessage = `Withdrawal accepted but temporarily queued — the hot wallet is being replenished for ${asset_symbol}. You will be notified when it is sent.`;
    }

    // Notify admin if liquidity is insufficient
    if (result.withdrawal_id && liquidityStatus === 'awaiting_liquidity') {
      await adminClient.from('admin_notifications').insert({
        type: 'withdrawal_liquidity',
        title: `Withdrawal queued: awaiting ${asset_symbol} liquidity`,
        message: `User ${user.id} withdrawal of ${amount} ${asset_symbol} accepted but hot wallet has insufficient liquidity (available: ${availableLiquidity.toFixed(4)}, pending: ${pendingOutbound.toFixed(4)})`,
        priority: 'high',
        metadata: {
          user_id: user.id,
          withdrawal_id: result.withdrawal_id,
          asset_symbol,
          amount,
          on_chain_balance: onChainBalance,
          pending_outbound: pendingOutbound,
          available_liquidity: availableLiquidity,
        },
        related_user_id: user.id,
        related_resource_id: result.withdrawal_id,
      });
    }

    return jsonResponse({
      success: true,
      withdrawal_id: result.withdrawal_id,
      amount: result.amount,
      fee: result.fee,
      new_balance: result.new_available,
      to_address: destinationAddress,
      status: 'pending',
      liquidity_status: liquidityStatus,
      status_detail: statusDetail,
      message: userMessage,
    });

  } catch (error: any) {
    console.error('[request-custodial-withdrawal] Error:', error);
    return errorResponse(error.message || 'An unexpected error occurred.', { reason: 'internal_error' });
  }
});
