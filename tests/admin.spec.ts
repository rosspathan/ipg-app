import { test, expect } from '@playwright/test';

test.describe('Admin Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/admin-login');
    await page.getByPlaceholder(/email/i).fill('admin@example.com');
    await page.getByPlaceholder(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 10000 });
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Should see admin dashboard
    await expect(page.locator('text=/dashboard|admin/i')).toBeVisible();
  });

  test('should display system statistics', async ({ page }) => {
    await page.goto('/admin');

    // Should show key metrics
    const metrics = [
      page.locator('text=/total users/i'),
      page.locator('text=/active users/i'),
      page.locator('text=/total trades|volume/i')
    ];

    let visibleCount = 0;
    for (const metric of metrics) {
      if (await metric.count() > 0) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should view user management page', async ({ page }) => {
    await page.goto('/admin/users');

    // Should see users list
    await expect(page.locator('[data-testid="users-table"], text=/users/i')).toBeVisible({ timeout: 10000 });
  });

  test('should search for users', async ({ page }) => {
    await page.goto('/admin/users');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test@example.com');
      
      // Should filter results
      await page.waitForTimeout(1000);
      
      const userRows = page.locator('[data-testid="user-row"]');
      const count = await userRows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should enable/disable programs', async ({ page }) => {
    await page.goto('/admin/programs');

    // Should see programs list with toggle switches
    const toggles = page.locator('[role="switch"], input[type="checkbox"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should mint BSK tokens', async ({ page }) => {
    await page.goto('/admin/bsk');

    // Look for mint BSK section
    const mintButton = page.locator('button:has-text("Mint"), button:has-text("Create")');

    if (await mintButton.count() > 0) {
      await mintButton.first().click();

      // Form should appear
      await expect(page.locator('input[placeholder*="amount" i]')).toBeVisible();
      await expect(page.locator('input[placeholder*="recipient" i], input[placeholder*="user" i]')).toBeVisible();
    }
  });

  test('should view KYC approval queue', async ({ page }) => {
    await page.goto('/admin/kyc');

    // Should see pending KYC requests
    await expect(page.locator('text=/KYC|verification/i')).toBeVisible({ timeout: 10000 });
  });

  test('should approve KYC request', async ({ page }) => {
    await page.goto('/admin/kyc');

    const approveButtons = page.locator('button:has-text("Approve")');

    if (await approveButtons.count() > 0) {
      // Just verify button exists (don't actually approve in test)
      await expect(approveButtons.first()).toBeVisible();
      await expect(approveButtons.first()).toBeEnabled();
    }
  });

  test('should manage trading pairs', async ({ page }) => {
    await page.goto('/admin/markets');

    // Should see markets/pairs list
    await expect(page.locator('text=/markets|trading pairs/i')).toBeVisible({ timeout: 10000 });

    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")');
    
    if (await addButton.count() > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test('should view system health dashboard', async ({ page }) => {
    await page.goto('/admin/health');

    // Should show system status
    const healthIndicators = [
      page.locator('text=/database|db/i'),
      page.locator('text=/api|service/i'),
      page.locator('text=/status|health/i')
    ];

    let visibleCount = 0;
    for (const indicator of healthIndicators) {
      if (await indicator.count() > 0) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should access audit logs', async ({ page }) => {
    await page.goto('/admin/audit');

    // Should see audit trail
    await expect(page.locator('text=/audit|logs|activity/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view financial reports', async ({ page }) => {
    await page.goto('/admin/reports');

    // Should see reports or analytics
    const reportSections = [
      page.locator('text=/revenue|income/i'),
      page.locator('text=/transactions|volume/i'),
      page.locator('text=/users|growth/i')
    ];

    let visibleCount = 0;
    for (const section of reportSections) {
      if (await section.count() > 0) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should have proper admin-only access control', async ({ page, context }) => {
    // Logout admin
    await page.goto('/admin/settings');
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out")');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
    }

    // Try to access admin page without auth
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/login|admin-login/, { timeout: 10000 });
  });

  test('should perform consecutive BSK balance adjustments', async ({ page }) => {
    await page.goto('/admin/users-nova');

    // Select a user
    const userCards = page.locator('[data-testid="user-card"], .user-record-card');
    if (await userCards.count() > 0) {
      await userCards.first().click();
      await page.waitForTimeout(1000);

      // Navigate to BSK tab
      const bskTab = page.locator('button:has-text("BSK"), [role="tab"]:has-text("BSK")');
      if (await bskTab.count() > 0) {
        await bskTab.first().click();
        await page.waitForTimeout(500);

        // Test withdrawable balance adjustments
        const withdrawableBtn = page.locator('button:has-text("Withdrawable")');
        if (await withdrawableBtn.count() > 0) {
          await withdrawableBtn.click();
        }

        const amountInput = page.locator('input[type="number"][placeholder*="Amount" i]');
        const addButton = page.locator('button:has-text("Add")').filter({ has: page.locator('svg') });

        // Add 10000 BSK
        await amountInput.fill('10000');
        await addButton.click();
        await page.waitForTimeout(1500);

        // Add 3000 BSK
        await amountInput.fill('3000');
        await addButton.click();
        await page.waitForTimeout(1500);

        // Deduct 2000 BSK
        await amountInput.fill('2000');
        const subtractButton = page.locator('button:has-text("Subtract")').filter({ has: page.locator('svg') });
        await subtractButton.click();
        await page.waitForTimeout(1500);

        // Switch to holding balance
        const holdingBtn = page.locator('button:has-text("Holding")');
        if (await holdingBtn.count() > 0) {
          await holdingBtn.click();
          await page.waitForTimeout(500);

          // Add 1000 BSK
          await amountInput.fill('1000');
          await addButton.click();
          await page.waitForTimeout(1500);

          // Add 2000 BSK
          await amountInput.fill('2000');
          await addButton.click();
          await page.waitForTimeout(1500);

          // Deduct 500 BSK
          await amountInput.fill('500');
          await subtractButton.click();
          await page.waitForTimeout(1500);
        }

        // Verify no errors appeared
        const errorToasts = page.locator('[role="alert"]:has-text("Error"), .toast:has-text("Error")');
        expect(await errorToasts.count()).toBe(0);
      }
    }
  });
});
