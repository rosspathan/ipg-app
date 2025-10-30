import { test, expect } from '@playwright/test';

/**
 * Ad Mining Program Tests
 * Tests the complete ad mining flow including:
 * - Ad display and interaction
 * - Reward claiming
 * - Daily limits and cooldowns
 * - BSK crediting
 */

test.describe('Ad Mining Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('should display available ads', async ({ page }) => {
    await page.goto('/app/programs/ad-mining');
    
    // Wait for ads to load
    await page.waitForSelector('[data-testid="ad-card"]', { timeout: 10000 });
    
    // Verify at least one ad is visible
    const adCards = page.locator('[data-testid="ad-card"]');
    await expect(adCards.first()).toBeVisible();
    
    // Verify ad details
    await expect(page.locator('text=Watch & Earn')).toBeVisible();
  });

  test('should play ad and claim reward', async ({ page }) => {
    await page.goto('/app/programs/ad-mining');
    await page.waitForSelector('[data-testid="ad-card"]');
    
    // Get initial balance
    const initialBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    
    // Click watch ad button
    await page.click('[data-testid="watch-ad-button"]');
    
    // Wait for ad to complete (simulate)
    await page.waitForTimeout(3000);
    
    // Click claim reward
    await page.click('button:has-text("Claim Reward")');
    
    // Verify success message
    await expect(page.locator('.sonner')).toContainText('Reward claimed');
    
    // Verify balance increased
    await page.waitForTimeout(1000);
    const newBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    expect(newBalance).not.toBe(initialBalance);
  });

  test('should enforce daily ad limits', async ({ page }) => {
    await page.goto('/app/programs/ad-mining');
    await page.waitForSelector('[data-testid="ad-card"]');
    
    // Watch maximum number of ads
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="watch-ad-button"]');
      await page.waitForTimeout(3000);
      await page.click('button:has-text("Claim Reward")');
      await page.waitForTimeout(1000);
    }
    
    // Try to watch another ad
    const watchButton = page.locator('[data-testid="watch-ad-button"]');
    await expect(watchButton).toBeDisabled();
    
    // Verify limit message
    await expect(page.locator('text=Daily limit reached')).toBeVisible();
  });

  test('should display ad mining statistics', async ({ page }) => {
    await page.goto('/app/programs/ad-mining');
    
    // Verify stats section
    await expect(page.locator('text=Today\'s Earnings')).toBeVisible();
    await expect(page.locator('text=Ads Watched')).toBeVisible();
    await expect(page.locator('text=Total Earned')).toBeVisible();
  });
});
