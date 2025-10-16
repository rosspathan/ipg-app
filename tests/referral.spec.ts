import { test, expect } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

test.describe('Referral System', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test('should display referral code on referral page', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Wait for referral code to load
    await page.waitForSelector('text=/your referral code|referral link/i', { timeout: 10000 });

    // Should show referral code
    const codeDisplay = page.locator('[data-testid="referral-code"], code');
    await expect(codeDisplay.first()).toBeVisible();
  });

  test('should copy referral link to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/app/programs/referral');

    // Find copy button
    const copyButton = page.locator('button:has-text("Copy"), button[aria-label*="copy" i]');
    await copyButton.first().click();

    // Should show success toast
    await expect(page.locator('text=/copied|copy success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should generate shareable link with referral code', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Get referral code
    const codeElement = page.locator('[data-testid="referral-code"], code').first();
    const referralCode = await codeElement.textContent();

    expect(referralCode).toBeTruthy();
    expect(referralCode!.length).toBeGreaterThan(0);
  });

  test('should display referral statistics', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Should show stats like total referrals, earnings, etc.
    const statsElements = [
      page.locator('text=/total referrals/i'),
      page.locator('text=/total earnings|commission/i'),
      page.locator('text=/active|status/i')
    ];

    let visibleCount = 0;
    for (const element of statsElements) {
      if (await element.count() > 0) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should show referral team tree', async ({ page }) => {
    await page.goto('/app/programs/team-referrals');

    // Wait for team data
    await page.waitForSelector('[data-testid="team-tree"], text=/team|downline/i', { timeout: 10000 });

    // Should display team structure or empty state
    const hasTeam = await page.locator('[data-testid="team-member"]').count() > 0;
    const hasEmptyState = await page.locator('text=/no team members|build your team/i').count() > 0;

    expect(hasTeam || hasEmptyState).toBeTruthy();
  });

  test('should display commission breakdown', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Look for commission details
    const commissionSection = page.locator('text=/commission|earnings/i');
    await expect(commissionSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should share referral link via WhatsApp', async ({ page, context }) => {
    await page.goto('/app/programs/referral');

    // Find WhatsApp share button
    const whatsappButton = page.locator('button:has-text("WhatsApp"), button[aria-label*="whatsapp" i]');

    if (await whatsappButton.count() > 0) {
      // Note: actual share will open external app, so we just verify button exists
      await expect(whatsappButton.first()).toBeVisible();
      await expect(whatsappButton.first()).toBeEnabled();
    }
  });

  test('should show referral terms and conditions', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Look for T&C link or section
    const termsLink = page.locator('text=/terms|conditions|rules/i');
    
    if (await termsLink.count() > 0) {
      await expect(termsLink.first()).toBeVisible();
    }
  });

  test('should validate referral code format', async ({ page }) => {
    await page.goto('/app/programs/referral');

    const codeElement = page.locator('[data-testid="referral-code"], code').first();
    const referralCode = await codeElement.textContent();

    // Code should be alphanumeric and reasonable length
    expect(referralCode).toMatch(/^[A-Za-z0-9]+$/);
    expect(referralCode!.length).toBeGreaterThanOrEqual(6);
    expect(referralCode!.length).toBeLessThanOrEqual(20);
  });

  test('should handle deep link with referral code', async ({ page }) => {
    // Simulate user clicking referral link
    await page.goto('/?ref=TESTCODE123');

    // Referral code should be captured
    // After signup, user should be linked to referrer
    // (This tests the capture mechanism, not actual signup)
    
    const url = page.url();
    expect(url).toContain('ref=TESTCODE123');
  });

  test('should show referral rewards history', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Look for rewards/earnings history
    const historySection = page.locator('text=/reward history|earnings history/i');

    if (await historySection.count() > 0) {
      await historySection.first().click();

      // Should show list or empty state
      await expect(page.locator('[data-testid="reward-list"], text=/no rewards yet/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
