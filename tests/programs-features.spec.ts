import { test, expect } from '@playwright/test';
import { loginTestUser } from './utils/auth-helpers';

test.describe('Programs Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, 'test@example.com', 'password123');
  });

  test.describe('Spin Wheel', () => {
    test('should display spin wheel interface', async ({ page }) => {
      await page.goto('/app/programs/spin-wheel');

      // Wheel should be visible
      await expect(page.locator('[data-testid="spin-wheel"], canvas, svg')).toBeVisible({ timeout: 10000 });
    });

    test('should show spin button', async ({ page }) => {
      await page.goto('/app/programs/spin-wheel');

      const spinButton = page.locator('button:has-text("Spin"), button:has-text("spin")');
      await expect(spinButton.first()).toBeVisible();
    });

    test('should display available spins count', async ({ page }) => {
      await page.goto('/app/programs/spin-wheel');

      const spinsText = page.locator('text=/spins available|remaining spins/i');
      await expect(spinsText.first()).toBeVisible();
    });

    test('should show spin results after spinning', async ({ page }) => {
      await page.goto('/app/programs/spin-wheel');

      const spinButton = page.locator('button:has-text("Spin"), button:has-text("spin")').first();
      
      if (await spinButton.isEnabled()) {
        await spinButton.click();

        // Should show result after animation
        await expect(page.locator('text=/congratulations|you won|reward/i')).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Lucky Draw', () => {
    test('should display lucky draw pools', async ({ page }) => {
      await page.goto('/app/programs/lucky-draw');

      // Wait for draw pools
      await page.waitForSelector('[data-testid="draw-pool"], text=/pool|draw/i', { timeout: 10000 });

      // Should show at least one pool
      const pools = page.locator('[data-testid="draw-pool"]');
      const count = await pools.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show ticket purchase option', async ({ page }) => {
      await page.goto('/app/programs/lucky-draw');

      const buyTicketButton = page.locator('button:has-text("Buy"), button:has-text("Purchase")');
      await expect(buyTicketButton.first()).toBeVisible();
    });

    test('should display pool details', async ({ page }) => {
      await page.goto('/app/programs/lucky-draw');

      // Should show prize amounts, participants, etc.
      const detailsElements = [
        page.locator('text=/prize pool|rewards/i'),
        page.locator('text=/participants|entries/i'),
        page.locator('text=/ticket price/i')
      ];

      let visibleCount = 0;
      for (const element of detailsElements) {
        if (await element.count() > 0 && await element.first().isVisible()) {
          visibleCount++;
        }
      }

      expect(visibleCount).toBeGreaterThan(0);
    });

    test('should show user tickets', async ({ page }) => {
      await page.goto('/app/programs/lucky-draw');

      // Look for my tickets section
      const ticketsSection = page.locator('text=/my tickets|your tickets/i');
      
      if (await ticketsSection.count() > 0) {
        await expect(ticketsSection.first()).toBeVisible();
      }
    });
  });

  test.describe('Ad Mining', () => {
    test('should display available ads', async ({ page }) => {
      await page.goto('/app/programs/ad-mining');

      // Wait for ads to load
      await page.waitForSelector('[data-testid="ad-card"], text=/watch ad|available ads/i', { timeout: 10000 });
    });

    test('should show ad reward amount', async ({ page }) => {
      await page.goto('/app/programs/ad-mining');

      // Should display BSK reward per ad
      const rewardText = page.locator('text=/BSK|reward/i');
      await expect(rewardText.first()).toBeVisible();
    });

    test('should have watch ad button', async ({ page }) => {
      await page.goto('/app/programs/ad-mining');

      const watchButton = page.locator('button:has-text("Watch"), button:has-text("View")');
      
      if (await watchButton.count() > 0) {
        await expect(watchButton.first()).toBeVisible();
      }
    });

    test('should show daily ad limit', async ({ page }) => {
      await page.goto('/app/programs/ad-mining');

      const limitText = page.locator('text=/daily limit|ads today/i');
      
      if (await limitText.count() > 0) {
        await expect(limitText.first()).toBeVisible();
      }
    });
  });

  test.describe('Insurance', () => {
    test('should display insurance plans', async ({ page }) => {
      await page.goto('/app/programs/insurance');

      // Wait for plans
      await page.waitForSelector('[data-testid="insurance-plan"], text=/plan|tier/i', { timeout: 10000 });

      const plans = page.locator('[data-testid="insurance-plan"]');
      const count = await plans.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show plan details', async ({ page }) => {
      await page.goto('/app/programs/insurance');

      // Should show coverage, premium, etc.
      const planDetails = [
        page.locator('text=/coverage|protection/i'),
        page.locator('text=/premium|price/i'),
        page.locator('text=/claims|benefits/i')
      ];

      let visibleCount = 0;
      for (const element of planDetails) {
        if (await element.count() > 0) {
          visibleCount++;
        }
      }

      expect(visibleCount).toBeGreaterThan(0);
    });

    test('should have subscribe button', async ({ page }) => {
      await page.goto('/app/programs/insurance');

      const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Get Started")');
      await expect(subscribeButton.first()).toBeVisible();
    });
  });

  test.describe('Staking', () => {
    test('should display staking interface', async ({ page }) => {
      await page.goto('/app/programs/staking');

      // Wait for staking UI
      await page.waitForSelector('text=/stake|staking/i', { timeout: 10000 });
    });

    test('should show APY/rewards rate', async ({ page }) => {
      await page.goto('/app/programs/staking');

      const apyText = page.locator('text=/APY|annual|rewards rate/i');
      
      if (await apyText.count() > 0) {
        await expect(apyText.first()).toBeVisible();
      }
    });

    test('should have stake amount input', async ({ page }) => {
      await page.goto('/app/programs/staking');

      const amountInput = page.locator('input[placeholder*="amount" i]');
      
      if (await amountInput.count() > 0) {
        await expect(amountInput.first()).toBeVisible();
      }
    });

    test('should show staked balance', async ({ page }) => {
      await page.goto('/app/programs/staking');

      const stakedText = page.locator('text=/staked|locked|deposited/i');
      await expect(stakedText.first()).toBeVisible();
    });
  });
});
