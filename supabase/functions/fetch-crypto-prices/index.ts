import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
}

// Map crypto symbols to CoinGecko IDs
const symbolToCoinGeckoId: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB ORIGINAL': 'binancecoin',
  'USDT': 'tether',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'LTC': 'litecoin',
  'TRX': 'tron',
  'SHIB': 'shiba-inu',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'INJ': 'injective-protocol',
  'FIL': 'filecoin',
  'NEAR': 'near',
  'VET': 'vechain',
  'AAVE': 'aave',
  'GRT': 'the-graph',
  'ALGO': 'algorand',
  'XLM': 'stellar',
  'SAND': 'the-sandbox',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Fetching cryptocurrency prices from CoinGecko...');

    // Get all coin IDs
    const coinIds = Object.values(symbolToCoinGeckoId).join(',');

    // Fetch prices from CoinGecko (free tier, no API key needed)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const prices: CoinGeckoPrice[] = await response.json();
    console.log(`Fetched ${prices.length} cryptocurrency prices`);

    // Get all markets from database
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select(`
        id,
        base_asset:assets!markets_base_asset_id_fkey(id, symbol),
        quote_asset:assets!markets_quote_asset_id_fkey(id, symbol)
      `)
      .eq('is_active', true);

    if (marketsError) {
      console.error('Error fetching markets:', marketsError);
      throw marketsError;
    }

    console.log(`Processing ${markets?.length || 0} markets`);

    // Update prices for each market
    const priceUpdates = [];
    for (const market of markets || []) {
      const baseSymbol = market.base_asset.symbol;
      const quoteSymbol = market.quote_asset.symbol;
      const symbol = `${baseSymbol}/${quoteSymbol}`;

      // Get base asset price in USD
      const coinGeckoId = symbolToCoinGeckoId[baseSymbol];
      const priceData = prices.find(p => p.id === coinGeckoId);

      if (!priceData) {
        console.log(`No price data found for ${baseSymbol}`);
        continue;
      }

      // Calculate price in quote currency
      let currentPrice = priceData.current_price;
      let priceChange24h = priceData.price_change_24h;
      let priceChangePercentage24h = priceData.price_change_percentage_24h;
      let high24h = priceData.high_24h;
      let low24h = priceData.low_24h;
      let volume24h = priceData.total_volume;

      // If quote is not USD/USDT, convert the price
      if (quoteSymbol !== 'USDT' && quoteSymbol !== 'USD') {
        const quoteCoinGeckoId = symbolToCoinGeckoId[quoteSymbol];
        const quotePrice = prices.find(p => p.id === quoteCoinGeckoId);
        
        if (quotePrice && quotePrice.current_price > 0) {
          currentPrice = priceData.current_price / quotePrice.current_price;
          priceChange24h = priceData.price_change_24h / quotePrice.current_price;
          high24h = priceData.high_24h / quotePrice.current_price;
          low24h = priceData.low_24h / quotePrice.current_price;
        } else {
          // Skip this market if we can't calculate the price
          console.log(`Skipping ${symbol}: unable to convert to ${quoteSymbol}`);
          continue;
        }
      }

      // Skip if price is null or 0
      if (!currentPrice || currentPrice === 0) {
        console.log(`Skipping ${symbol}: invalid price`);
        continue;
      }

      priceUpdates.push({
        market_id: market.id,
        symbol: symbol,
        current_price: currentPrice,
        price_change_24h: priceChange24h,
        price_change_percentage_24h: priceChangePercentage24h,
        high_24h: high24h,
        low_24h: low24h,
        volume_24h: volume24h,
        market_cap: priceData.market_cap,
        last_updated: new Date().toISOString(),
      });
    }

    // Upsert prices to database
    if (priceUpdates.length > 0) {
      const { error: upsertError } = await supabase
        .from('market_prices')
        .upsert(priceUpdates, {
          onConflict: 'market_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Error upserting prices:', upsertError);
        throw upsertError;
      }

      console.log(`Successfully updated ${priceUpdates.length} market prices`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: priceUpdates.length,
        message: `Updated ${priceUpdates.length} market prices`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-crypto-prices:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
