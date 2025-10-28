import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  txHash: string;
}

interface BscScanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  tokenSymbol: string;
  contractAddress: string;
  blockNumber: string;
  timeStamp: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { txHash }: VerifyRequest = await req.json();

    if (!txHash || !txHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash format');
    }

    console.log(`[verify-transaction] User ${user.id} verifying tx ${txHash.slice(0, 10)}...`);

    // Check if already exists
    const { data: existing } = await supabaseClient
      .from('deposits')
      .select('id, amount, status')
      .eq('tx_hash', txHash.toLowerCase())
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      console.log(`[verify-transaction] Transaction already exists: ${existing.id}`);
      return new Response(JSON.stringify({
        success: false,
        found: true,
        alreadyExists: true,
        deposit: existing,
        message: 'This transaction is already credited to your account'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Fetch user's wallet address
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address, wallet_addresses')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const evmAddress = profile.wallet_addresses?.['bsc-mainnet'] || 
                       profile.wallet_addresses?.['bsc'] || 
                       profile.wallet_address;

    if (!evmAddress) {
      throw new Error('No wallet address found');
    }

    // Get BscScan API key
    const bscscanApiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!bscscanApiKey) {
      throw new Error('BscScan API key not configured');
    }

    // Query BscScan for specific transaction
    const bscscanUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${evmAddress}&startblock=0&endblock=999999999&sort=desc&apikey=${bscscanApiKey}`;
    
    console.log(`[verify-transaction] Querying BscScan for address ${evmAddress.slice(0, 6)}...`);
    
    const bscResponse = await fetch(bscscanUrl);
    const bscData = await bscResponse.json();

    if (bscData.status !== '1' || !bscData.result) {
      throw new Error('Failed to fetch transactions from BscScan');
    }

    const transfers: BscScanTransaction[] = bscData.result;
    const targetTx = transfers.find(tx => tx.hash.toLowerCase() === txHash.toLowerCase());

    if (!targetTx) {
      console.log(`[verify-transaction] Transaction not found in BscScan results`);
      return new Response(JSON.stringify({
        success: false,
        found: false,
        message: 'Transaction not found. Please verify the transaction hash and that it was sent to your wallet address.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Verify it's an inbound transaction
    if (targetTx.to.toLowerCase() !== evmAddress.toLowerCase()) {
      throw new Error('Transaction is not sent to your wallet address');
    }

    // Get asset details
    const { data: asset } = await supabaseClient
      .from('assets')
      .select('id, symbol, decimals')
      .eq('contract_address', targetTx.contractAddress)
      .eq('is_active', true)
      .maybeSingle();

    if (!asset) {
      throw new Error(`Asset with contract ${targetTx.contractAddress} not supported`);
    }

    const amount = parseInt(targetTx.value) / Math.pow(10, parseInt(targetTx.tokenDecimal));

    // Create deposit record
    const { data: deposit, error: insertError } = await supabaseClient
      .from('deposits')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        amount,
        tx_hash: txHash.toLowerCase(),
        network: 'bsc',
        status: 'confirmed',
        confirmations: 999,
        required_confirmations: 2
      })
      .select()
      .single();

    if (insertError) {
      console.error('[verify-transaction] Insert error:', insertError);
      throw new Error(`Failed to create deposit: ${insertError.message}`);
    }

    console.log(`[verify-transaction] Successfully created deposit ${deposit.id}`);

    // Invoke monitor-deposit to finalize
    await supabaseClient.functions.invoke('monitor-deposit', {
      body: { deposit_id: deposit.id }
    });

    return new Response(JSON.stringify({
      success: true,
      found: true,
      amount,
      symbol: asset.symbol,
      deposit,
      message: `Successfully credited ${amount} ${asset.symbol}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[verify-transaction] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
