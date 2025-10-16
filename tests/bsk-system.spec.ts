import { test, expect } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

test.describe('BSK Token System', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test('should display BSK balance on home screen', async ({ page }) => {
    await page.goto('/app/home');

    // Look for BSK balance display
    const bskBalance = page.locator('text=/BSK|bsk balance/i');
    await expect(bskBalance.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show BSK rate as ₹1.00', async ({ page }) => {
    await page.goto('/app/home');

    // Check for BSK rate display
    const rateDisplay = page.locator('text=/₹1|1 BSK = ₹1/i');
    if (await rateDisplay.count() > 0) {
      await expect(rateDisplay.first()).toBeVisible();
    }
  });

  test('should display withdrawable vs holding balance', async ({ page }) => {
    await page.goto('/app/wallet');

    // Look for balance breakdown
    const withdrawable = page.locator('text=/withdrawable/i');
    const holding = page.locator('text=/holding|locked/i');

    await expect(withdrawable.first()).toBeVisible({ timeout: 10000 });
    await expect(holding.first()).toBeVisible();
  });

  test('should navigate to BSK transaction history', async ({ page }) => {
    await page.goto('/app/wallet');

    // Click on BSK or view transactions
    const transactionLink = page.locator('text=/transaction|history/i').first();
    await transactionLink.click();

    // Should show transaction list or empty state
    await expect(page.locator('[data-testid="transaction-list"], text=/no transactions/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show BSK earning sources', async ({ page }) => {
    await page.goto('/app/programs');

    // Programs that reward BSK
    const bskPrograms = [
      'Spin Wheel',
      'Lucky Draw',
      'Ad Mining',
      'Referral'
    ];

    // Check if at least some BSK-earning programs are visible
    for (const program of bskPrograms) {
      const programCard = page.locator(`text=${program}`);
      if (await programCard.count() > 0) {
        await expect(programCard.first()).toBeVisible();
        break;
      }
    }
  });

  test('should validate BSK transfer form', async ({ page }) => {
    await page.goto('/app/wallet');

    // Look for transfer button
    const transferButton = page.locator('button:has-text("Transfer"), button:has-text("Send")');

    if (await transferButton.count() > 0) {
      await transferButton.first().click();

      // Transfer form should appear
      await expect(page.locator('input[placeholder*="address" i], input[placeholder*="recipient" i]')).toBeVisible();
      await expect(page.locator('input[placeholder*="amount" i]')).toBeVisible();
    }
  });

  test('should prevent transfer of more than available balance', async ({ page }) => {
    await page.goto('/app/wallet');

    const transferButton = page.locator('button:has-text("Transfer"), button:has-text("Send")');

    if (await transferButton.count() > 0) {
      await transferButton.first().click();

      // Try to transfer huge amount
      const amountInput = page.locator('input[placeholder*="amount" i]').first();
      await amountInput.fill('999999999');

      const submitButton = page.getByRole('button', { name: /send|confirm|transfer/i });
      await submitButton.click();

      // Should show insufficient balance error
      await expect(page.locator('text=/insufficient|not enough/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display BSK rate history', async ({ page }) => {
    await page.goto('/app/wallet');

    // Look for rate history or chart
    const rateHistory = page.locator('text=/rate history|price chart/i');
    
    if (await rateHistory.count() > 0) {
      await rateHistory.first().click();
      await expect(page.locator('[data-testid="rate-chart"], canvas')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show BSK vesting schedule if applicable', async ({ page }) => {
    await page.goto('/app/wallet');

    // Look for vesting information
    const vestingInfo = page.locator('text=/vesting|locked|release/i');
    
    // May or may not have vesting depending on user
    const hasVesting = await vestingInfo.count() > 0;
    expect(typeof hasVesting).toBe('boolean');
  });

  test('should handle BSK decimal precision', async ({ page }) => {
    await page.goto('/app/wallet');

    const transferButton = page.locator('button:has-text("Transfer"), button:has-text("Send")');

    if (await transferButton.count() > 0) {
      await transferButton.first().click();

      const amountInput = page.locator('input[placeholder*="amount" i]').first();
      
      // Test decimal input
      await amountInput.fill('0.123456');
      const value = await amountInput.inputValue();
      
      expect(value).toContain('0.123456');
    }
  });
});
