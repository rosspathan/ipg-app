import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();

    // Fetch crypto prices from CoinGecko
    const cryptoIds = symbols.map((s: string) => {
      const mapping: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'BNB': 'binancecoin'
      };
      return mapping[s] || s.toLowerCase();
    }).join(',');

    const cryptoResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`
    );
    const cryptoPrices = await cryptoResponse.json();

    // Fetch INR rate (simplified - in production use forex API)
    const inrUsdRate = 84; // 1 USD = 84 INR (fetch from API in production)

    const result: Record<string, any> = {
      inr_usd_rate: inrUsdRate,
      rates: {}
    };

    symbols.forEach((symbol: string) => {
      const mapping: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'BNB': 'binancecoin'
      };
      const id = mapping[symbol] || symbol.toLowerCase();
      result.rates[symbol] = {
        usd: cryptoPrices[id]?.usd || 0,
        inr: (cryptoPrices[id]?.usd || 0) * inrUsdRate
      };
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
