/**
 * Username + Wallet Patch E2E Tests
 * Verifies username display and EVM address functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Username + Wallet Patch', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and wait for auth
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');
  });

  test('should display username from email in header', async ({ page }) => {
    const usernameEl = page.locator('[data-testid="header-username"]');
    await expect(usernameEl).toBeVisible();
    
    const username = await usernameEl.textContent();
    expect(username).toBeTruthy();
    expect(username).not.toBe('User');
    
    console.log('Header username:', username);
  });

  test('should show EVM address on wallet page', async ({ page }) => {
    await page.goto('/app/wallet');
    await page.waitForLoadState('networkidle');

    // Check for dev ribbon
    await expect(page.locator('[data-testid="dev-ribbon"]')).toBeVisible();

    // Check for EVM address (may be hidden initially)
    const addressEl = page.locator('[data-testid="wallet-evm-address"]');
    await expect(addressEl).toBeVisible();

    // Check action buttons
    await expect(page.locator('[data-testid="wallet-copy"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-qr"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-explorer"]')).toBeVisible();
  });

  test('should show EVM address on deposit page for BEP20', async ({ page }) => {
    await page.goto('/app/wallet/deposit');
    await page.waitForLoadState('networkidle');

    // Select crypto tab
    await page.click('text=Crypto');
    await page.waitForTimeout(500);

    // Check for deposit address
    const depositAddr = page.locator('[data-testid="deposit-evm-address"]');
    await expect(depositAddr).toBeVisible();

    // Check deposit action buttons
    await expect(page.locator('[data-testid="deposit-qr"]')).toBeVisible();
    await expect(page.locator('[data-testid="deposit-copy"]')).toBeVisible();
    await expect(page.locator('[data-testid="deposit-explorer"]')).toBeVisible();
  });

  test('should copy address when copy button clicked', async ({ page }) => {
    await page.goto('/app/wallet');
    await page.waitForLoadState('networkidle');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    await page.click('[data-testid="wallet-copy"]');

    // Wait for toast
    await page.waitForTimeout(500);
    
    // Check for success toast (assuming toast implementation)
    const toast = page.locator('text=/copied/i');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should show username on ID card page', async ({ page }) => {
    await page.goto('/app/profile/id-card');
    await page.waitForLoadState('networkidle');

    const usernameEl = page.locator('[data-testid="idcard-username"]');
    await expect(usernameEl).toBeVisible();
    
    const username = await usernameEl.textContent();
    expect(username).toBeTruthy();
    
    console.log('ID card username:', username);
  });

  test('should have version marker on wallet page', async ({ page }) => {
    await page.goto('/app/wallet');
    await page.waitForLoadState('networkidle');

    const versionAttr = await page.locator('[data-version="usr+wallet-v1"]').count();
    expect(versionAttr).toBeGreaterThan(0);
  });
});
