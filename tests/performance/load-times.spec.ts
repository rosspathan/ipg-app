import { test, expect } from '@playwright/test';

/**
 * Performance Tests
 * Tests page load times and rendering performance
 */

test.describe('Performance - Page Load Times', () => {
  test('home page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/app/home');
    await page.waitForSelector('[data-testid="bsk-balance"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
    console.log(`Home page loaded in ${loadTime}ms`);
  });

  test('spin wheel should load within 2 seconds', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    const startTime = Date.now();
    await page.goto('/app/programs/spin-wheel');
    await page.waitForSelector('[data-testid="spin-wheel-canvas"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
    console.log(`Spin wheel loaded in ${loadTime}ms`);
  });

  test('lucky draw should load within 2 seconds', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    const startTime = Date.now();
    await page.goto('/app/programs/lucky-draw');
    await page.waitForSelector('[data-testid="draw-template"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
    console.log(`Lucky draw loaded in ${loadTime}ms`);
  });
});

test.describe('Performance - Bundle Size', () => {
  test('should not load excessive JavaScript', async ({ page }) => {
    await page.goto('/app/home');
    
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(r => r.name.endsWith('.js'))
        .reduce((total, r) => total + (r as any).transferSize, 0);
    });
    
    // Total JS should be less than 500KB
    expect(resources).toBeLessThan(500 * 1024);
    console.log(`Total JS size: ${(resources / 1024).toFixed(2)}KB`);
  });
});

test.describe('Performance - Database Queries', () => {
  test('balance query should complete within 500ms', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="bsk-balance"]');
    const queryTime = Date.now() - startTime;
    
    expect(queryTime).toBeLessThan(500);
    console.log(`Balance query completed in ${queryTime}ms`);
  });
});
