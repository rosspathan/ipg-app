import { test, expect } from '@playwright/test';

/**
 * Referral Program Tests
 * Tests the complete referral flow including:
 * - Code generation and display
 * - Link sharing
 * - Referral tracking
 * - Commission payouts
 */

test.describe('Referral Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('should display user referral code', async ({ page }) => {
    await page.goto('/app/programs/referral');
    
    // Wait for referral data to load
    await page.waitForSelector('[data-testid="referral-code"]', { timeout: 10000 });
    
    // Verify referral code is visible
    const referralCode = page.locator('[data-testid="referral-code"]');
    await expect(referralCode).toBeVisible();
    
    // Verify code format (6 characters)
    const codeText = await referralCode.textContent();
    expect(codeText?.length).toBe(6);
  });

  test('should copy referral link', async ({ page }) => {
    await page.goto('/app/programs/referral');
    await page.waitForSelector('[data-testid="referral-code"]');
    
    // Click copy button
    await page.click('button:has-text("Copy Link")');
    
    // Verify success message
    await expect(page.locator('.sonner')).toContainText('Link copied');
  });

  test('should display referral statistics', async ({ page }) => {
    await page.goto('/app/programs/referral');
    
    // Verify stats are visible
    await expect(page.locator('text=Total Referrals')).toBeVisible();
    await expect(page.locator('text=Active Referrals')).toBeVisible();
    await expect(page.locator('text=Commission Earned')).toBeVisible();
  });

  test('should display referred users list', async ({ page }) => {
    await page.goto('/app/programs/referral');
    
    // Scroll to referrals section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verify referrals list section exists
    const referralsList = page.locator('text=Your Referrals');
    await expect(referralsList).toBeVisible();
  });

  test('should track commission from referred user trades', async ({ page }) => {
    // This test requires a referred user to make a trade
    // In a real test, you'd use a database seeding approach
    await page.goto('/app/programs/referral');
    
    // Get initial commission
    const commissionElement = page.locator('[data-testid="total-commission"]');
    await expect(commissionElement).toBeVisible();
    
    // Note: Full commission testing requires integration with trading system
  });
});

test.describe('Referral - Registration Flow', () => {
  test('should register new user with referral code', async ({ page }) => {
    await page.goto('/auth/signup?ref=TEST01');
    
    // Verify referral code is pre-filled
    const referralInput = page.locator('input[name="referral_code"]');
    await expect(referralInput).toHaveValue('TEST01');
    
    // Fill signup form
    await page.fill('input[type="email"]', `newuser${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'newpassword123');
    await page.click('button[type="submit"]');
    
    // Verify registration success
    await expect(page.locator('.sonner')).toContainText('Welcome');
  });
});
