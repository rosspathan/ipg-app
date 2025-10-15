/**
 * Trading System - Basic Order Operations Tests
 * Tests: Place orders, cancel orders, balance locking
 */

import { test, expect } from '@playwright/test';
import { createTestUser, getAuthToken, generateTestEmail } from './utils/auth-helpers';
import { setupTestBalance, getBalance, cleanupTestOrders } from './utils/db-helpers';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocblgldglqhlrmtnynmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A';

test.describe('Trading Basic Operations', () => {
  let testEmail: string;
  let testPassword: string;
  let userId: string;
  let authToken: string;

  test.beforeAll(async () => {
    testEmail = generateTestEmail();
    testPassword = 'Test1234!';
    
    const { user } = await createTestUser(testEmail, testPassword);
    userId = user!.id;
    authToken = await getAuthToken(testEmail, testPassword);
    
    // Setup initial balances
    await setupTestBalance(userId, 'USDT', 10000, authToken);
    await setupTestBalance(userId, 'BTC', 1, authToken);
  });

  test.afterEach(async () => {
    await cleanupTestOrders(userId, authToken);
  });

  test('should place a market buy order successfully', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data, error } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        quantity: 0.01,
      }
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.order).toBeDefined();
    expect(data.order.symbol).toBe('BTC/USDT');
    expect(data.order.side).toBe('buy');
    expect(data.order.type).toBe('market');
    expect(data.order.status).toBe('pending');
    
    console.log('Market buy order placed:', data.order.id);
  });

  test('should place a limit sell order successfully', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data, error } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'limit',
        quantity: 0.01,
        price: 50000,
      }
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.order).toBeDefined();
    expect(data.order.type).toBe('limit');
    expect(data.order.price).toBe(50000);
    
    // Check balance locked
    const balance = await getBalance(userId, 'BTC', authToken);
    expect(balance.locked).toBeGreaterThanOrEqual(0.01);
    
    console.log('Limit sell order placed, balance locked:', balance.locked);
  });

  test('should cancel a pending limit order', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    // Place limit order
    const { data: placeData } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'limit',
        quantity: 0.01,
        price: 50000,
      }
    });

    const orderId = placeData.order.id;

    // Check balance locked before cancel
    const balanceBefore = await getBalance(userId, 'BTC', authToken);
    expect(balanceBefore.locked).toBeGreaterThanOrEqual(0.01);

    // Cancel order
    const { data: cancelData, error } = await supabase.functions.invoke('cancel-order', {
      body: { order_id: orderId }
    });

    expect(error).toBeNull();
    expect(cancelData.success).toBe(true);

    // Check balance unlocked after cancel
    const balanceAfter = await getBalance(userId, 'BTC', authToken);
    expect(balanceAfter.locked).toBeLessThan(balanceBefore.locked);
    
    console.log('Order cancelled, balance unlocked');
  });

  test('should fail to place order with insufficient balance', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data, error } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        quantity: 1000, // Unrealistic amount
      }
    });

    expect(error || data?.error).toBeDefined();
    console.log('Insufficient balance error:', error || data?.error);
  });

  test('should fail to cancel already filled order', async () => {
    // This will be more relevant after matching engine is active
    // For now, just verify the cancel validation works
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data, error } = await supabase.functions.invoke('cancel-order', {
      body: { order_id: 'non-existent-order-id' }
    });

    expect(error || data?.error).toBeDefined();
    console.log('Cancel non-existent order error:', error || data?.error);
  });

  test('should validate required order parameters', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    // Missing quantity
    const { data: data1, error: error1 } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
      }
    });
    expect(error1 || data1?.error).toBeDefined();

    // Missing price for limit order
    const { data: data2, error: error2 } = await supabase.functions.invoke('place-order', {
      body: {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.01,
      }
    });
    expect(error2 || data2?.error).toBeDefined();

    console.log('Validation errors working correctly');
  });
});
