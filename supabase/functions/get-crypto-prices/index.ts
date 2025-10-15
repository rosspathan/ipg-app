import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceResponse {
  prices: Record<string, number>;
  change_24h: number;
  timestamp: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols = [] } = await req.json();
    
    console.log('📊 Fetching crypto prices for:', symbols);

    // Map our symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'USDC': 'usd-coin',
      'IPG': 'ipg-token', // Mock - would need real ID
      'BSK': 'bsk-token', // Mock - internal token
    };

    const coingeckoIds = symbols
      .map((s: string) => symbolMap[s.toUpperCase()])
      .filter((id: string) => id && !['ipg-token', 'bsk-token'].includes(id));

    let prices: Record<string, number> = {};
    let change24h = 0;

    if (coingeckoIds.length > 0) {
      // Fetch from CoinGecko (free tier, no API key needed)
      const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true`;
      
      const response = await fetch(coingeckoUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Map back to symbols
      for (const [symbol, geckoId] of Object.entries(symbolMap)) {
        if (data[geckoId]) {
          prices[symbol] = data[geckoId].usd;
          
          // Average 24h change
          if (data[geckoId].usd_24h_change) {
            change24h += data[geckoId].usd_24h_change;
          }
        }
      }

      if (Object.keys(prices).length > 0) {
        change24h = change24h / Object.keys(prices).length;
      }
    }

    // Add mock prices for internal tokens
    if (symbols.includes('IPG')) {
      prices['IPG'] = 0.50; // Mock price
    }
    if (symbols.includes('BSK')) {
      prices['BSK'] = 1.00; // 1:1 with INR
    }

    const result: PriceResponse = {
      prices,
      change_24h: change24h,
      timestamp: Date.now()
    };

    console.log('✅ Prices fetched:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('❌ Error fetching prices:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        prices: {},
        change_24h: 0,
        timestamp: Date.now()
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});
