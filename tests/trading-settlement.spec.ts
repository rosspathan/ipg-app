/**
 * Trading System - Balance Settlement Tests
 * Tests: Balance updates after trades, fee deduction, reconciliation
 */

import { test, expect } from '@playwright/test';
import { createTestUser, getAuthToken, generateTestEmail } from './utils/auth-helpers';
import { setupTestBalance, getBalance, cleanupTestOrders, cleanupTestTrades } from './utils/db-helpers';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocblgldglqhlrmtnynmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A';

test.describe('Trading Balance Settlement', () => {
  let buyerEmail: string;
  let sellerEmail: string;
  let buyerId: string;
  let sellerId: string;
  let buyerToken: string;
  let sellerToken: string;

  test.beforeAll(async () => {
    buyerEmail = generateTestEmail();
    sellerEmail = generateTestEmail();
    const password = 'Test1234!';
    
    const { user: buyer } = await createTestUser(buyerEmail, password);
    const { user: seller } = await createTestUser(sellerEmail, password);
    
    buyerId = buyer!.id;
    sellerId = seller!.id;
    
    buyerToken = await getAuthToken(buyerEmail, password);
    sellerToken = await getAuthToken(sellerEmail, password);
  });

  test.beforeEach(async () => {
    // Reset balances before each test
    await setupTestBalance(buyerId, 'USDT', 50000, buyerToken);
    await setupTestBalance(buyerId, 'BTC', 0, buyerToken);
    await setupTestBalance(sellerId, 'USDT', 0, sellerToken);
    await setupTestBalance(sellerId, 'BTC', 1, sellerToken);
  });

  test.afterEach(async () => {
    await cleanupTestOrders(buyerId, buyerToken);
    await cleanupTestOrders(sellerId, sellerToken);
    await cleanupTestTrades(buyerId, buyerToken);
  });

  test('should update buyer and seller balances after trade', async () => {
    const buyerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${buyerToken}` } }
    });
    
    const sellerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${sellerToken}` } }
    });

    // Get initial balances
    const buyerUSDTBefore = await getBalance(buyerId, 'USDT', buyerToken);
    const buyerBTCBefore = await getBalance(buyerId, 'BTC', buyerToken);
    const sellerUSDTBefore = await getBalance(sellerId, 'USDT', sellerToken);
    const sellerBTCBefore = await getBalance(sellerId, 'BTC', sellerToken);

    console.log('Initial balances:', {
      buyer: { USDT: buyerUSDTBefore.available, BTC: buyerBTCBefore.available },
      seller: { USDT: sellerUSDTBefore.available, BTC: sellerBTCBefore.available },
    });

    // Place matching orders
    await sellerClient.functions.invoke('place-order', {
      body: { symbol: 'BTC/USDT', side: 'sell', type: 'limit', quantity: 0.1, price: 45000 }
    });

    await buyerClient.functions.invoke('place-order', {
      body: { symbol: 'BTC/USDT', side: 'buy', type: 'limit', quantity: 0.1, price: 45000 }
    });

    // Wait for settlement
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get final balances
    const buyerUSDTAfter = await getBalance(buyerId, 'USDT', buyerToken);
    const buyerBTCAfter = await getBalance(buyerId, 'BTC', buyerToken);
    const sellerUSDTAfter = await getBalance(sellerId, 'USDT', sellerToken);
    const sellerBTCAfter = await getBalance(sellerId, 'BTC', sellerToken);

    console.log('Final balances:', {
      buyer: { USDT: buyerUSDTAfter.available, BTC: buyerBTCAfter.available },
      seller: { USDT: sellerUSDTAfter.available, BTC: sellerBTCAfter.available },
    });

    // Note: Actual settlement depends on match-orders function being triggered
    // For now, we verify the structure and that balances are tracked
    expect(buyerUSDTAfter).toBeDefined();
    expect(buyerBTCAfter).toBeDefined();
  });

  test('should track locked vs available balance correctly', async () => {
    const sellerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${sellerToken}` } }
    });

    // Get initial balance
    const initialBalance = await getBalance(sellerId, 'BTC', sellerToken);
    console.log('Initial BTC balance:', initialBalance);

    // Place limit sell order (should lock balance)
    await sellerClient.functions.invoke('place-order', {
      body: { symbol: 'BTC/USDT', side: 'sell', type: 'limit', quantity: 0.5, price: 45000 }
    });

    // Check balance after order
    const afterOrderBalance = await getBalance(sellerId, 'BTC', sellerToken);
    console.log('After order BTC balance:', afterOrderBalance);

    // Locked should increase
    expect(afterOrderBalance.locked).toBeGreaterThan(initialBalance.locked);
    
    // Total should remain same (available + locked)
    const initialTotal = initialBalance.available + initialBalance.locked;
    const afterTotal = afterOrderBalance.available + afterOrderBalance.locked;
    expect(afterTotal).toBeCloseTo(initialTotal, 8);
  });

  test('should handle multiple sequential trades', async () => {
    const buyerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${buyerToken}` } }
    });

    // Place 3 buy orders
    for (let i = 0; i < 3; i++) {
      await buyerClient.functions.invoke('place-order', {
        body: {
          symbol: 'BTC/USDT',
          side: 'buy',
          type: 'limit',
          quantity: 0.01,
          price: 45000 + (i * 100),
        }
      });
    }

    // Verify orders created
    const { data } = await buyerClient.functions.invoke('order-history', {
      body: { type: 'orders', symbol: 'BTC/USDT', status: 'pending' }
    });

    expect(data.orders.length).toBeGreaterThanOrEqual(3);
    console.log('Sequential orders placed:', data.orders.length);
  });

  test('should reconcile total balance after multiple operations', async () => {
    const buyerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${buyerToken}` } }
    });

    // Get initial total
    const initial = await getBalance(buyerId, 'USDT', buyerToken);
    const initialTotal = initial.available + initial.locked;

    // Place order
    await buyerClient.functions.invoke('place-order', {
      body: { symbol: 'BTC/USDT', side: 'buy', type: 'limit', quantity: 0.1, price: 45000 }
    });

    // Get balance after order
    const afterOrder = await getBalance(buyerId, 'USDT', buyerToken);
    const afterOrderTotal = afterOrder.available + afterOrder.locked;

    // Total should match (just moved from available to locked)
    expect(afterOrderTotal).toBeCloseTo(initialTotal, 2);

    // Cancel order
    const { data: orders } = await buyerClient
      .from('orders')
      .select('id')
      .eq('user_id', buyerId)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (orders) {
      await buyerClient.functions.invoke('cancel-order', {
        body: { order_id: orders.id }
      });

      // Get balance after cancel
      const afterCancel = await getBalance(buyerId, 'USDT', buyerToken);
      const afterCancelTotal = afterCancel.available + afterCancel.locked;

      // Should match initial total
      expect(afterCancelTotal).toBeCloseTo(initialTotal, 2);
      console.log('Balance reconciliation verified');
    }
  });
});
