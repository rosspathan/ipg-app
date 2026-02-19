import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSCSCAN_API_KEY = Deno.env.get('BSCSCAN_API_KEY') || '';

// ⛔ IMMUTABLE: Staking is EXCLUSIVELY locked to IPG. Do NOT change this.
// Changing this would allow non-IPG tokens to be credited to staking accounts.
const IPG_CONTRACT = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E';
const IPG_SYMBOL = 'IPG';

// Forbidden contracts that must NEVER be credited to staking accounts
const FORBIDDEN_CONTRACTS = [
  '0x7437d96d2dca13525b4a6021865d41997dee1f09', // USDI — permanently forbidden
  '0x742575866c0eb1b6b6350159d536447477085cef', // BSK  — permanently forbidden
  '0x55d398326f99059ff775485246999027b3197955', // USDT — permanently forbidden
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header if present
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Also check body for user_id (for specific user check)
    const body = await req.json().catch(() => ({}));
    userId = body.user_id || userId;

    console.log('[staking-deposit-monitor] Starting for user:', userId);

    // Get staking config with hot wallet address
    const { data: config, error: configError } = await supabase
      .from('crypto_staking_config')
      .select('admin_hot_wallet_address')
      .single();

    if (configError || !config?.admin_hot_wallet_address) {
      console.error('[staking-deposit-monitor] No staking hot wallet configured');
      return new Response(
        JSON.stringify({ error: 'Staking not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hotWalletAddress = config.admin_hot_wallet_address.toLowerCase();
    console.log('[staking-deposit-monitor] Hot wallet:', hotWalletAddress);

    // If checking for specific user, get their wallet address from profiles
    let userFilter = '';
    if (userId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', userId)
        .single();

      if (userProfile) {
        userFilter = (userProfile.bsc_wallet_address || userProfile.wallet_address || '').toLowerCase();
        console.log('[staking-deposit-monitor] Checking deposits from:', userFilter);
      }
    }

    // Fetch recent transfers to the hot wallet from BscScan
    const apiUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${IPG_CONTRACT}&address=${hotWalletAddress}&page=1&offset=100&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== '1' || !data.result) {
      console.log('[staking-deposit-monitor] No transactions found');
      return new Response(
        JSON.stringify({ deposited: false, message: 'No deposits found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter incoming transfers to the hot wallet
    // ⛔ SECURITY: Only process IPG contract transfers. Forbidden contracts are blocked.
    // Validate that BscScan returned data for the IPG contract ONLY.
    const filteredByContract = data.result.filter((tx: any) => {
      const contractAddr = (tx.contractAddress || '').toLowerCase();
      if (contractAddr !== IPG_CONTRACT.toLowerCase()) {
        console.warn(`[staking-deposit-monitor] BLOCKED non-IPG contract ${contractAddr} — only ${IPG_CONTRACT} is permitted`);
        return false;
      }
      if (FORBIDDEN_CONTRACTS.includes(contractAddr)) {
        console.error(`[staking-deposit-monitor] SECURITY: Forbidden contract ${contractAddr} blocked from staking credit`);
        return false;
      }
      return true;
    });

    const incomingTransfers = filteredByContract.filter((tx: any) => 
      tx.to.toLowerCase() === hotWalletAddress &&
      (!userFilter || tx.from.toLowerCase() === userFilter)
    );

    console.log('[staking-deposit-monitor] Found', incomingTransfers.length, 'incoming transfers');

    let totalDeposited = 0;
    let processedCount = 0;

    for (const tx of incomingTransfers) {
      // Check if this deposit was already processed
      const { data: existingDeposit } = await supabase
        .from('crypto_staking_ledger')
        .select('id')
        .eq('tx_hash', tx.hash)
        .single();

      if (existingDeposit) {
        console.log('[staking-deposit-monitor] Already processed:', tx.hash);
        continue;
      }

      // Find the user by their wallet address from profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .or(`bsc_wallet_address.ilike.${tx.from},wallet_address.ilike.${tx.from}`)
        .single();

      if (!userProfile) {
        console.log('[staking-deposit-monitor] Unknown sender:', tx.from);
        continue;
      }

      const depositUserId = userProfile.user_id;
      const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));

      console.log('[staking-deposit-monitor] Processing deposit:', amount, 'IPG from', tx.from);

      // Get or create user's staking account
      let { data: account } = await supabase
        .from('user_staking_accounts')
        .select('*')
        .eq('user_id', depositUserId)
        .single();

      if (!account) {
        const { data: newAccount, error: createError } = await supabase
          .from('user_staking_accounts')
          .insert({
            user_id: depositUserId,
            currency: 'IPG',
            available_balance: 0,
            staked_balance: 0,
            total_rewards_earned: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('[staking-deposit-monitor] Error creating account:', createError);
          continue;
        }
        account = newAccount;
      }

      const balanceBefore = account.available_balance;
      const balanceAfter = balanceBefore + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_staking_accounts')
        .update({ 
          available_balance: balanceAfter,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('[staking-deposit-monitor] Error updating balance:', updateError);
        continue;
      }

      // Record in ledger
      const { error: ledgerError } = await supabase
        .from('crypto_staking_ledger')
        .insert({
          user_id: depositUserId,
          staking_account_id: account.id,
          tx_type: 'deposit',
          amount: amount,
          fee_amount: 0,
          currency: 'IPG',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          tx_hash: tx.hash,
          notes: `Deposit from ${tx.from}`
        });

      if (ledgerError) {
        console.error('[staking-deposit-monitor] Error recording ledger:', ledgerError);
        continue;
      }

      totalDeposited += amount;
      processedCount++;
      console.log('[staking-deposit-monitor] Credited', amount, 'IPG to user', depositUserId);
    }

    return new Response(
      JSON.stringify({ 
        deposited: processedCount > 0,
        amount: totalDeposited,
        count: processedCount,
        message: processedCount > 0 
          ? `Processed ${processedCount} deposits totaling ${totalDeposited} IPG`
          : 'No new deposits to process'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[staking-deposit-monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
