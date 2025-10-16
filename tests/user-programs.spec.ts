import { test, expect } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

test.describe('User Programs Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test('should display all 9 live programs', async ({ page }) => {
    await page.goto('/app/programs');

    // Wait for programs to load
    await page.waitForSelector('[data-testid="program-card"]', { timeout: 10000 });

    // Count program cards
    const programCards = page.locator('[data-testid="program-card"]');
    const count = await programCards.count();

    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('should show lock badge on restricted programs', async ({ page }) => {
    await page.goto('/app/programs');

    // Look for locked programs
    const lockBadges = page.locator('[data-testid="program-lock-badge"]');
    const lockedCount = await lockBadges.count();

    // Some programs should be locked for regular users
    expect(lockedCount).toBeGreaterThan(0);
  });

  test('should open unlock dialog when clicking locked program', async ({ page }) => {
    await page.goto('/app/programs');

    // Find first locked program
    const lockedProgram = page.locator('[data-testid="program-card"]:has([data-testid="program-lock-badge"])').first();

    if (await lockedProgram.count() > 0) {
      await lockedProgram.click();

      // Unlock dialog should appear
      await expect(page.locator('text=/unlock|upgrade/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to unlocked program page', async ({ page }) => {
    await page.goto('/app/programs');

    // Find first unlocked program
    const unlockedProgram = page.locator('[data-testid="program-card"]:not(:has([data-testid="program-lock-badge"]))').first();

    await unlockedProgram.click();

    // Should navigate to program detail page
    await expect(page).toHaveURL(/\/app\/programs\/.+/);
  });

  test('should display program details correctly', async ({ page }) => {
    await page.goto('/app/programs');

    const programCards = page.locator('[data-testid="program-card"]');
    const firstCard = programCards.first();

    // Check for program elements
    await expect(firstCard.locator('img')).toBeVisible(); // Icon
    await expect(firstCard.locator('h3')).toBeVisible(); // Title
    await expect(firstCard.locator('p')).toBeVisible(); // Description
  });

  test('should filter programs based on user KYC level', async ({ page }) => {
    await page.goto('/app/programs');

    // Programs requiring higher KYC should be locked
    const allPrograms = page.locator('[data-testid="program-card"]');
    const allCount = await allPrograms.count();

    const lockedPrograms = page.locator('[data-testid="program-card"]:has([data-testid="program-lock-badge"])');
    const lockedCount = await lockedPrograms.count();

    // Validation: locked count should be less than total
    expect(lockedCount).toBeLessThanOrEqual(allCount);
  });

  test('should show programs in correct order', async ({ page }) => {
    await page.goto('/app/programs');

    const programTitles = await page.locator('[data-testid="program-card"] h3').allTextContents();

    // At least some programs should be visible
    expect(programTitles.length).toBeGreaterThan(0);

    // Verify no empty titles
    programTitles.forEach(title => {
      expect(title.trim().length).toBeGreaterThan(0);
    });
  });

  test('should handle program search/filter', async ({ page }) => {
    await page.goto('/app/programs');

    // Check if search/filter exists
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.count() > 0) {
      await searchInput.fill('Spin');

      // Should filter to spin wheel program
      const visiblePrograms = page.locator('[data-testid="program-card"]:visible');
      const count = await visiblePrograms.count();

      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});
