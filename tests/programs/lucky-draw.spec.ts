import { test, expect } from '@playwright/test';

/**
 * Lucky Draw Program Tests
 * Tests the complete lucky draw flow including:
 * - Ticket purchase with BSK
 * - Balance validation
 * - Draw execution (admin)
 * - Winner selection and prize distribution
 */

test.describe('Lucky Draw Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('should display active draw with correct details', async ({ page }) => {
    await page.goto('/app/programs/lucky-draw');
    
    // Wait for draw data to load
    await page.waitForSelector('[data-testid="draw-template"]', { timeout: 10000 });
    
    // Verify draw details are visible
    await expect(page.locator('text=Prize Pool')).toBeVisible();
    await expect(page.locator('text=Ticket Price')).toBeVisible();
    await expect(page.locator('text=Draw Date')).toBeVisible();
  });

  test('should purchase tickets with sufficient balance', async ({ page }) => {
    await page.goto('/app/programs/lucky-draw');
    await page.waitForSelector('[data-testid="draw-template"]');
    
    // Get initial balance
    const initialBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    
    // Set ticket quantity
    await page.fill('input[type="number"]', '2');
    
    // Click buy tickets
    await page.click('button:has-text("Buy Tickets")');
    
    // Wait for confirmation
    await expect(page.locator('.sonner')).toContainText('Tickets purchased successfully');
    
    // Verify balance decreased
    await page.waitForTimeout(1000);
    const newBalance = await page.locator('[data-testid="bsk-balance"]').textContent();
    expect(newBalance).not.toBe(initialBalance);
  });

  test('should reject purchase with insufficient balance', async ({ page }) => {
    await page.goto('/app/programs/lucky-draw');
    await page.waitForSelector('[data-testid="draw-template"]');
    
    // Try to buy excessive tickets
    await page.fill('input[type="number"]', '99999');
    await page.click('button:has-text("Buy Tickets")');
    
    // Verify error message
    await expect(page.locator('.sonner')).toContainText('Insufficient balance');
  });

  test('should display purchased tickets', async ({ page }) => {
    await page.goto('/app/programs/lucky-draw');
    
    // Purchase a ticket first
    await page.waitForSelector('[data-testid="draw-template"]');
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Buy Tickets")');
    await page.waitForTimeout(2000);
    
    // Verify ticket appears in "My Tickets" section
    const myTickets = page.locator('text=My Tickets');
    await expect(myTickets).toBeVisible();
  });
});

test.describe('Lucky Draw - Admin Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    // Login as admin
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'adminpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('admin should execute draw and select winners', async ({ page }) => {
    await page.goto('/admin/programs/control/lucky-draw');
    
    // Find active draw
    await page.waitForSelector('[data-testid="active-draw"]');
    
    // Click execute draw button
    await page.click('button:has-text("Execute Draw")');
    
    // Confirm execution
    await page.click('button:has-text("Confirm")');
    
    // Wait for draw completion
    await expect(page.locator('.sonner')).toContainText('Draw executed successfully');
    
    // Verify winners are displayed
    await expect(page.locator('text=Winners')).toBeVisible();
  });
});
