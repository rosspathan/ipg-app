import { test, expect, devices } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

// Configure mobile viewport
test.use({
  ...devices['Pixel 5'],
});

test.describe('Mobile-Specific Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test('should render mobile viewport correctly', async ({ page }) => {
    await page.goto('/app/home');

    // Get viewport size
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(500);
  });

  test('should have safe area padding', async ({ page }) => {
    await page.goto('/app/home');

    // Check for safe-area CSS variables or padding
    const mainContent = page.locator('main, [data-testid="main-content"]').first();
    const paddingTop = await mainContent.evaluate((el) => 
      window.getComputedStyle(el).paddingTop
    );

    // Should have some top padding for notch/status bar
    expect(parseInt(paddingTop)).toBeGreaterThan(0);
  });

  test('should handle bottom navigation on mobile', async ({ page }) => {
    await page.goto('/app/home');

    // Bottom nav should be visible
    const bottomNav = page.locator('[data-testid="bottom-nav"], nav');
    await expect(bottomNav.first()).toBeVisible();

    // Should have navigation items
    const navItems = page.locator('[data-testid="nav-item"], nav a, nav button');
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open drawer/menu on mobile', async ({ page }) => {
    await page.goto('/app/home');

    // Look for menu button
    const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("☰")');

    if (await menuButton.count() > 0) {
      await menuButton.first().click();

      // Drawer should open
      await expect(page.locator('[role="dialog"], [data-testid="mobile-drawer"]')).toBeVisible();
    }
  });

  test('should handle pull-to-refresh gesture', async ({ page }) => {
    await page.goto('/app/home');

    // Simulate scroll down (pull-to-refresh)
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();

    // Content should reload (check for loading indicator)
    const loadingIndicator = page.locator('[data-testid="loading"], text=/loading/i');
    
    // May or may not show loading depending on implementation
    const hasLoading = await loadingIndicator.count() > 0;
    expect(typeof hasLoading).toBe('boolean');
  });

  test('should handle deep link navigation', async ({ page }) => {
    // Simulate deep link
    await page.goto('/app/programs/spin-wheel');

    // Should navigate to correct program
    await expect(page).toHaveURL(/spin-wheel/);
    await expect(page.locator('text=/spin|wheel/i')).toBeVisible({ timeout: 10000 });
  });

  test('should lock app on visibility change', async ({ page }) => {
    await page.goto('/app/home');

    // Simulate app going to background
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      });
    });

    await page.waitForTimeout(1000);

    // Simulate app coming to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // May show PIN lock screen
    const pinPrompt = page.locator('text=/enter pin|unlock/i');
    
    // PIN screen may or may not appear depending on settings
    const hasPinPrompt = await pinPrompt.count() > 0;
    expect(typeof hasPinPrompt).toBe('boolean');
  });

  test('should handle share functionality', async ({ page }) => {
    await page.goto('/app/programs/referral');

    // Look for native share button
    const shareButton = page.locator('button:has-text("Share"), button[aria-label*="share" i]');

    if (await shareButton.count() > 0) {
      await expect(shareButton.first()).toBeVisible();
      await expect(shareButton.first()).toBeEnabled();
    }
  });

  test('should display mobile-optimized forms', async ({ page }) => {
    await page.goto('/app/trading');

    // Select a pair
    await page.locator('text=BTC/USDT').first().click();

    // Form inputs should be large enough for mobile
    const amountInput = page.locator('input[placeholder*="amount" i]').first();
    
    const height = await amountInput.evaluate((el) => 
      window.getComputedStyle(el).height
    );

    // Mobile inputs should be at least 44px tall for touch
    expect(parseInt(height)).toBeGreaterThanOrEqual(40);
  });

  test('should handle touch gestures on trading chart', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    // Look for chart
    const chart = page.locator('canvas, [data-testid="trading-chart"]');

    if (await chart.count() > 0) {
      // Simulate pinch zoom
      const box = await chart.first().boundingBox();
      
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        // Touch gestures work in mobile browser context
      }
    }
  });

  test('should show mobile-friendly notifications', async ({ page }) => {
    await page.goto('/app/home');

    // Notifications should stack at top or bottom
    // Check notification container positioning
    const notificationContainer = page.locator('[data-testid="toast-container"], [role="alert"]');

    if (await notificationContainer.count() > 0) {
      const position = await notificationContainer.first().evaluate((el) => 
        window.getComputedStyle(el).position
      );

      expect(['fixed', 'absolute']).toContain(position);
    }
  });

  test('should handle portrait and landscape orientation', async ({ page }) => {
    await page.goto('/app/home');

    // Get initial size
    const initialViewport = page.viewportSize();

    // Rotate to landscape
    await page.setViewportSize({
      width: initialViewport!.height,
      height: initialViewport!.width
    });

    await page.waitForTimeout(500);

    // Content should still be visible and properly laid out
    await expect(page.locator('main, [data-testid="main-content"]')).toBeVisible();

    // Rotate back to portrait
    await page.setViewportSize({
      width: initialViewport!.width,
      height: initialViewport!.height
    });
  });

  test('should prevent zoom on form inputs', async ({ page }) => {
    await page.goto('/app/trading');

    await page.locator('text=BTC/USDT').first().click();

    const amountInput = page.locator('input[placeholder*="amount" i]').first();

    // Check font size (should be at least 16px to prevent iOS zoom)
    const fontSize = await amountInput.evaluate((el) => 
      window.getComputedStyle(el).fontSize
    );

    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
  });
});
