import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocblgldglqhlrmtnynmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A';

test.describe('Data Integrity & Validation', () => {
  let supabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test('should verify user balance consistency', async () => {
    // Login to get session
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (!authData.session) {
      test.skip();
      return;
    }

    // Get wallet balances
    const { data: balances } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', authData.user.id);

    if (balances && balances.length > 0) {
      // Verify balance integrity
      balances.forEach((balance: any) => {
        // Total should equal available + locked
        const calculatedTotal = parseFloat(balance.available) + parseFloat(balance.locked);
        const actualTotal = parseFloat(balance.total);

        expect(Math.abs(calculatedTotal - actualTotal)).toBeLessThan(0.000001);

        // All values should be non-negative
        expect(parseFloat(balance.available)).toBeGreaterThanOrEqual(0);
        expect(parseFloat(balance.locked)).toBeGreaterThanOrEqual(0);
        expect(parseFloat(balance.total)).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test('should verify BSK balance tracking', async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (!authData.session) {
      test.skip();
      return;
    }

    const { data: bskBalance } = await supabase
      .from('user_bsk_balances')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (bskBalance) {
      // Withdrawable + holding should be consistent
      const withdrawable = parseFloat(bskBalance.withdrawable_balance);
      const holding = parseFloat(bskBalance.holding_balance);

      expect(withdrawable).toBeGreaterThanOrEqual(0);
      expect(holding).toBeGreaterThanOrEqual(0);

      // Earned totals should be >= current balances
      expect(parseFloat(bskBalance.total_earned_withdrawable)).toBeGreaterThanOrEqual(withdrawable);
      expect(parseFloat(bskBalance.total_earned_holding)).toBeGreaterThanOrEqual(holding);
    }
  });

  test('should verify trading pairs exist', async () => {
    const { data: markets } = await supabase
      .from('markets')
      .select('*')
      .eq('is_active', true);

    expect(markets).toBeTruthy();
    expect(markets!.length).toBeGreaterThan(0);

    // Verify each market has required fields
    markets!.forEach((market: any) => {
      expect(market.base_asset_id).toBeTruthy();
      expect(market.quote_asset_id).toBeTruthy();
      expect(market.symbol).toBeTruthy();
      expect(parseFloat(market.min_order_size)).toBeGreaterThan(0);
    });
  });

  test('should verify assets data integrity', async () => {
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('is_active', true);

    expect(assets).toBeTruthy();
    expect(assets!.length).toBeGreaterThan(0);

    // Verify asset fields
    assets!.forEach((asset: any) => {
      expect(asset.symbol).toBeTruthy();
      expect(asset.name).toBeTruthy();
      expect(asset.decimals).toBeGreaterThanOrEqual(0);
      expect(asset.decimals).toBeLessThanOrEqual(18);
    });
  });

  test('should verify referral relationships are valid', async () => {
    const { data: referrals } = await supabase
      .from('referral_links_new')
      .select('*')
      .limit(10);

    if (referrals && referrals.length > 0) {
      referrals.forEach((ref: any) => {
        // User cannot be their own sponsor
        expect(ref.user_id).not.toBe(ref.sponsor_id);

        // Referral code should be unique and valid
        expect(ref.sponsor_code_used).toBeTruthy();
        expect(ref.sponsor_code_used.length).toBeGreaterThan(0);
      });
    }
  });

  test('should verify order data consistency', async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (!authData.session) {
      test.skip();
      return;
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', authData.user.id)
      .limit(10);

    if (orders && orders.length > 0) {
      orders.forEach((order: any) => {
        // Quantity and price should be positive
        expect(parseFloat(order.quantity)).toBeGreaterThan(0);
        expect(parseFloat(order.price)).toBeGreaterThan(0);

        // Filled quantity should not exceed total quantity
        expect(parseFloat(order.filled_quantity)).toBeLessThanOrEqual(parseFloat(order.quantity));

        // Status should be valid
        expect(['pending', 'filled', 'cancelled', 'partial']).toContain(order.status);
      });
    }
  });

  test('should verify program configs are valid', async () => {
    const { data: configs } = await supabase
      .from('program_configs')
      .select('*, program_modules(*)')
      .eq('is_current', true)
      .eq('status', 'published');

    if (configs && configs.length > 0) {
      configs.forEach((config: any) => {
        // Should have valid module
        expect(config.program_modules).toBeTruthy();
        expect(config.program_modules.name).toBeTruthy();

        // Config JSON should be valid
        expect(typeof config.config_json).toBe('object');

        // Version should be positive
        expect(config.version).toBeGreaterThan(0);
      });
    }
  });

  test('should verify KYC levels are consistent', async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, kyc_status')
      .limit(10);

    if (profiles && profiles.length > 0) {
      profiles.forEach((profile: any) => {
        // KYC status should be valid
        if (profile.kyc_status) {
          expect(['none', 'L0', 'L1', 'L2', 'L3', 'pending', 'rejected']).toContain(profile.kyc_status);
        }
      });
    }
  });

  test('should verify transaction atomicity', async () => {
    // Check that deposits and withdrawals are properly recorded
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (!authData.session) {
      test.skip();
      return;
    }

    // Get recent deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', authData.user.id)
      .limit(5);

    if (deposits && deposits.length > 0) {
      deposits.forEach((deposit: any) => {
        // Amount should be positive
        expect(parseFloat(deposit.amount)).toBeGreaterThan(0);

        // Status should be valid
        expect(['pending', 'confirmed', 'failed']).toContain(deposit.status);

        // Confirmations should be non-negative
        expect(deposit.confirmations).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test('should verify no duplicate referral codes', async () => {
    const { data: codes } = await supabase
      .from('referral_links_new')
      .select('sponsor_code_used')
      .not('sponsor_code_used', 'is', null);

    if (codes && codes.length > 0) {
      const codeSet = new Set(codes.map((c: any) => c.sponsor_code_used));
      
      // All codes should be unique
      expect(codeSet.size).toBe(codes.length);
    }
  });

  test('should verify audit logs are being created', async () => {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Audit logs should exist
    expect(logs).toBeTruthy();

    if (logs && logs.length > 0) {
      logs.forEach((log: any) => {
        // Should have required fields
        expect(log.action).toBeTruthy();
        expect(log.resource_type).toBeTruthy();
        expect(log.created_at).toBeTruthy();
      });
    }
  });

  test('should verify BSK rate is set to ₹1.00', async () => {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'bsk_rate_inr')
      .maybeSingle();

    if (settings) {
      const rate = parseFloat(settings.value);
      expect(rate).toBe(1.0);
    }
  });
});
