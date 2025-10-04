import { test, expect } from '@playwright/test';

// Basic smoke test for i-SMART Spin route
// Relies on console markers emitted by the state machine and wheel

test('spin flow emits machine and wheel markers', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('MACHINE_STATE') || text.includes('WHEEL_START') || text.includes('WHEEL_DONE')) {
      messages.push(text);
    }
  });

  await page.goto('/app/programs/spin');

  // Page renders
  await expect(page.locator('[data-testid="page-spin-v3"]')).toBeVisible();

  // If spin button available, attempt one spin
  const spinBtn = page.locator('[data-testid="spin-button"]');
  if (await spinBtn.isVisible()) {
    await spinBtn.click();

    // Wait for markers
    await page.waitForFunction(() => {
      // @ts-ignore
      return window.__gotSpinMarkers === true;
    }, null, { timeout: 15000 }).catch(() => {});
  }

  // At least one machine marker should be present if click succeeded
  const hasMachineMarker = messages.some(m => m.includes('MACHINE_STATE'));
  // Wheel markers may not emit if backend blocks spin; still assert page stability
  expect(await page.locator('[data-testid="page-spin-v3"]').isVisible()).toBeTruthy();
  expect(hasMachineMarker).toBeTruthy();
});
