import { test, expect } from '@playwright/test';

/**
 * Spin Wheel Program Tests
 * Tests the complete spin wheel flow including:
 * - Loading wheel configuration
 * - Spinning mechanics
 * - Prize distribution
 * - BSK reward crediting
 */

test.describe('Spin Wheel Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    // Login with test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('should load spin wheel with valid segments', async ({ page }) => {
    await page.goto('/app/programs/spin-wheel');
    
    // Wait for segments to load
    await page.waitForSelector('[data-testid="spin-wheel-canvas"]', { timeout: 10000 });
    
    // Verify wheel is visible
    const canvas = page.locator('[data-testid="spin-wheel-canvas"]');
    await expect(canvas).toBeVisible();
    
    // Verify spin button exists
    const spinButton = page.locator('button:has-text("Spin Now")');
    await expect(spinButton).toBeVisible();
  });

  test('should execute spin and award prize', async ({ page }) => {
    await page.goto('/app/programs/spin-wheel');
    await page.waitForSelector('[data-testid="spin-wheel-canvas"]');
    
    // Get initial balance
    const initialBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    
    // Click spin button
    await page.click('button:has-text("Spin Now")');
    
    // Wait for spin animation to complete
    await page.waitForTimeout(5000);
    
    // Verify success toast appears
    await expect(page.locator('.sonner')).toContainText('Congratulations');
    
    // Verify balance increased
    await page.waitForTimeout(1000);
    const newBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    expect(newBalance).not.toBe(initialBalance);
  });

  test('should prevent rapid consecutive spins', async ({ page }) => {
    await page.goto('/app/programs/spin-wheel');
    await page.waitForSelector('[data-testid="spin-wheel-canvas"]');
    
    // Click spin button
    await page.click('button:has-text("Spin Now")');
    
    // Try to click again immediately
    const spinButton = page.locator('button:has-text("Spin Now")');
    await expect(spinButton).toBeDisabled();
  });

  test('should display spin history', async ({ page }) => {
    await page.goto('/app/programs/spin-wheel');
    
    // Scroll to history section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verify history section exists
    const historySection = page.locator('text=Recent Spins');
    await expect(historySection).toBeVisible();
  });
});
