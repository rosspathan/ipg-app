/**
 * Settle Trade On-Chain Edge Function - P2P Settlement Model
 * Creates settlement requests for users to sign transfers from their own wallets
 * 
 * This function:
 * 1. Retrieves wallet addresses for both parties
 * 2. Creates settlement_requests for each party to send their side of the trade
 * 3. Users sign transactions from their own wallets (NOT admin wallet)
 * 4. Updates trade_settlements table with pending status
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token contract addresses on BSC (BEP-20)
const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
  'IPG': '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
  'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  'BNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

interface SettlementRequest {
  trade_id: string;
  buyer_id: string;
  seller_id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  base_amount: string;
  quote_amount: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let settlementId: string | null = null;

  try {
    const body: SettlementRequest = await req.json();
    const { trade_id, buyer_id, seller_id, symbol, base_asset, quote_asset, base_amount, quote_amount } = body;

    console.log(`[settle-trade-onchain] Processing P2P settlement for trade ${trade_id}`);
    console.log(`[settle-trade-onchain] Seller sends ${base_amount} ${base_asset} → Buyer`);
    console.log(`[settle-trade-onchain] Buyer sends ${quote_amount} ${quote_asset} → Seller`);

    // Validate required fields
    if (!trade_id || !buyer_id || !seller_id || !base_asset || !quote_asset || !base_amount || !quote_amount) {
      throw new Error('Missing required fields');
    }

    // Check if settlement already exists for this trade (idempotency)
    const { data: existingSettlement } = await supabase
      .from('trade_settlements')
      .select('id, status')
      .eq('trade_id', trade_id)
      .single();

    if (existingSettlement) {
      console.log(`[settle-trade-onchain] Settlement already exists: ${existingSettlement.id}, status: ${existingSettlement.status}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Settlement already processed',
          settlement_id: existingSettlement.id,
          status: existingSettlement.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get buyer wallet address
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', buyer_id)
      .single();

    let buyerWallet = buyerProfile?.bsc_wallet_address || buyerProfile?.wallet_address;

    if (!buyerWallet) {
      const { data: buyerUserWallet } = await supabase
        .from('wallets_user')
        .select('address')
        .eq('user_id', buyer_id)
        .eq('chain', 'bsc')
        .eq('is_primary', true)
        .single();
      buyerWallet = buyerUserWallet?.address;
    }

    if (!buyerWallet) {
      throw new Error(`Buyer wallet not found for user ${buyer_id}. User needs to connect a BSC wallet.`);
    }

    // Get seller wallet address
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', seller_id)
      .single();

    let sellerWallet = sellerProfile?.bsc_wallet_address || sellerProfile?.wallet_address;

    if (!sellerWallet) {
      const { data: sellerUserWallet } = await supabase
        .from('wallets_user')
        .select('address')
        .eq('user_id', seller_id)
        .eq('chain', 'bsc')
        .eq('is_primary', true)
        .single();
      sellerWallet = sellerUserWallet?.address;
    }

    if (!sellerWallet) {
      throw new Error(`Seller wallet not found for user ${seller_id}. User needs to connect a BSC wallet.`);
    }

    console.log(`[settle-trade-onchain] Buyer wallet: ${buyerWallet}`);
    console.log(`[settle-trade-onchain] Seller wallet: ${sellerWallet}`);

    // Validate token contracts exist
    const baseTokenAddress = TOKEN_CONTRACTS[base_asset];
    const quoteTokenAddress = TOKEN_CONTRACTS[quote_asset];

    if (!baseTokenAddress) {
      throw new Error(`Unsupported base asset: ${base_asset}`);
    }
    if (!quoteTokenAddress) {
      throw new Error(`Unsupported quote asset: ${quote_asset}`);
    }

    // Create settlement record with pending_user_action status
    const { data: settlement, error: insertError } = await supabase
      .from('trade_settlements')
      .insert({
        trade_id,
        buyer_id,
        seller_id,
        symbol,
        base_asset,
        quote_asset,
        base_amount: parseFloat(base_amount),
        quote_amount: parseFloat(quote_amount),
        buyer_wallet: buyerWallet,
        seller_wallet: sellerWallet,
        status: 'pending_user_action'
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create settlement record: ${insertError.message}`);
    }

    settlementId = settlement.id;
    console.log(`[settle-trade-onchain] Created settlement record: ${settlementId}`);

    // Create P2P settlement requests for each party
    // 1. Seller sends base_asset (e.g., IPG) to Buyer
    const { error: sellerRequestError } = await supabase
      .from('settlement_requests')
      .insert({
        trade_id,
        user_id: seller_id,
        counterparty_id: buyer_id,
        direction: 'send',
        asset_symbol: base_asset,
        amount: parseFloat(base_amount),
        from_wallet: sellerWallet,
        to_wallet: buyerWallet,
        status: 'pending'
      });

    if (sellerRequestError) {
      throw new Error(`Failed to create seller settlement request: ${sellerRequestError.message}`);
    }

    // 2. Buyer sends quote_asset (e.g., USDT) to Seller
    const { error: buyerRequestError } = await supabase
      .from('settlement_requests')
      .insert({
        trade_id,
        user_id: buyer_id,
        counterparty_id: seller_id,
        direction: 'send',
        asset_symbol: quote_asset,
        amount: parseFloat(quote_amount),
        from_wallet: buyerWallet,
        to_wallet: sellerWallet,
        status: 'pending'
      });

    if (buyerRequestError) {
      throw new Error(`Failed to create buyer settlement request: ${buyerRequestError.message}`);
    }

    console.log(`[settle-trade-onchain] ✓ Created P2P settlement requests for trade ${trade_id}`);
    console.log(`[settle-trade-onchain] Seller (${seller_id}) sends ${base_amount} ${base_asset} to ${buyerWallet}`);
    console.log(`[settle-trade-onchain] Buyer (${buyer_id}) sends ${quote_amount} ${quote_asset} to ${sellerWallet}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        settlement_id: settlementId,
        message: 'P2P settlement requests created. Both parties need to sign their transfers.',
        settlement_type: 'p2p',
        requests: [
          {
            party: 'seller',
            action: `Send ${base_amount} ${base_asset} to buyer`,
            to_wallet: buyerWallet
          },
          {
            party: 'buyer', 
            action: `Send ${quote_amount} ${quote_asset} to seller`,
            to_wallet: sellerWallet
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[settle-trade-onchain] Error:', error);

    if (settlementId) {
      await supabase
        .from('trade_settlements')
        .update({ 
          status: 'failed',
          error_message: error.message,
          retry_count: 1
        })
        .eq('id', settlementId);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        settlement_id: settlementId
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
