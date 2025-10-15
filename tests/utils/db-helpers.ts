import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocblgldglqhlrmtnynmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A';

export async function setupTestBalance(userId: string, symbol: string, amount: number, authToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  
  // Get asset ID
  const { data: asset } = await supabase
    .from('assets')
    .select('id')
    .eq('symbol', symbol)
    .single();
  
  if (!asset) throw new Error(`Asset ${symbol} not found`);
  
  // Set balance
  await supabase
    .from('wallet_balances')
    .upsert({
      user_id: userId,
      asset_id: asset.id,
      available: amount,
      locked: 0,
    });
}

export async function getBalance(userId: string, symbol: string, authToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  
  const { data: asset } = await supabase
    .from('assets')
    .select('id')
    .eq('symbol', symbol)
    .single();
  
  if (!asset) return { available: 0, locked: 0 };
  
  const { data: balance } = await supabase
    .from('wallet_balances')
    .select('available, locked')
    .eq('user_id', userId)
    .eq('asset_id', asset.id)
    .single();
  
  return balance || { available: 0, locked: 0 };
}

export async function cleanupTestOrders(userId: string, authToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  
  await supabase
    .from('orders')
    .delete()
    .eq('user_id', userId);
}

export async function cleanupTestTrades(userId: string, authToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  
  await supabase
    .from('trades')
    .delete()
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
}
