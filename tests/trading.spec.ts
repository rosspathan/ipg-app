import { test, expect } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

test.describe('Trading System', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test('should display trading pairs', async ({ page }) => {
    await page.goto('/app/trading');

    // Wait for markets to load
    await page.waitForSelector('[data-testid="trading-pair"]', { timeout: 10000 });

    const pairs = page.locator('[data-testid="trading-pair"]');
    const count = await pairs.count();

    // Should have at least 30 pairs
    expect(count).toBeGreaterThanOrEqual(30);
  });

  test('should select a trading pair and show order form', async ({ page }) => {
    await page.goto('/app/trading');

    // Select BTC/USDT pair
    await page.locator('text=BTC/USDT').first().click();

    // Order form should be visible
    await expect(page.locator('text=/buy|sell/i')).toBeVisible();
    await expect(page.locator('input[placeholder*="amount" i], input[placeholder*="quantity" i]')).toBeVisible();
  });

  test('should validate insufficient balance error', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Try to buy with large amount
    const amountInput = page.locator('input[placeholder*="amount" i]').first();
    await amountInput.fill('999999');

    const buyButton = page.getByRole('button', { name: /buy/i });
    await buyButton.click();

    // Should show insufficient balance error
    await expect(page.locator('text=/insufficient balance|not enough/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display order book', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Check for order book elements
    const orderBook = page.locator('[data-testid="order-book"]');
    if (await orderBook.count() > 0) {
      await expect(orderBook).toBeVisible();

      // Should have buy/sell sections
      await expect(page.locator('text=/bids|asks/i')).toBeVisible();
    }
  });

  test('should show user order history', async ({ page }) => {
    await page.goto('/app/trading/orders');

    // Wait for orders table
    await page.waitForSelector('[data-testid="orders-table"], text=/no orders|order history/i', { timeout: 10000 });

    // Either has orders or shows empty state
    const hasOrders = await page.locator('[data-testid="order-row"]').count() > 0;
    const hasEmptyState = await page.locator('text=/no orders/i').count() > 0;

    expect(hasOrders || hasEmptyState).toBeTruthy();
  });

  test('should place market order (validation only)', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Select market order type
    const marketTab = page.getByRole('tab', { name: /market/i });
    if (await marketTab.count() > 0) {
      await marketTab.click();
    }

    // Fill small amount
    const amountInput = page.locator('input[placeholder*="amount" i]').first();
    await amountInput.fill('0.0001');

    // Get buy button (don't click to avoid actual trade)
    const buyButton = page.getByRole('button', { name: /buy/i });
    await expect(buyButton).toBeEnabled();
  });

  test('should place limit order (validation only)', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Select limit order type
    const limitTab = page.getByRole('tab', { name: /limit/i });
    if (await limitTab.count() > 0) {
      await limitTab.click();
    }

    // Fill price and amount
    const priceInput = page.locator('input[placeholder*="price" i]').first();
    const amountInput = page.locator('input[placeholder*="amount" i]').first();

    await priceInput.fill('50000');
    await amountInput.fill('0.0001');

    const buyButton = page.getByRole('button', { name: /buy/i });
    await expect(buyButton).toBeEnabled();
  });

  test('should cancel open order', async ({ page }) => {
    await page.goto('/app/trading/orders');

    // Look for open orders
    const cancelButtons = page.locator('button:has-text("Cancel"), button:has-text("cancel")');

    if (await cancelButtons.count() > 0) {
      const firstCancel = cancelButtons.first();
      await firstCancel.click();

      // Confirm cancellation if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Should show success message
      await expect(page.locator('text=/cancelled|canceled/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display current balance in trading view', async ({ page }) => {
    await page.goto('/app/trading');

    // Balance should be visible
    const balanceText = page.locator('text=/balance|available/i');
    await expect(balanceText.first()).toBeVisible();
  });

  test('should show trading fees', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Look for fee information
    const feeText = page.locator('text=/fee|commission/i');
    if (await feeText.count() > 0) {
      await expect(feeText.first()).toBeVisible();
    }
  });
});
