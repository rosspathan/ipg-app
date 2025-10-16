import { test, expect } from '@playwright/test';
import { generateTestEmail } from './utils/auth-helpers';

test.describe('Authentication & Onboarding Flow', () => {
  test('should complete full signup flow with OTP', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Navigate to signup
    await page.goto('/auth/login');
    await expect(page.locator('text=Sign In')).toBeVisible();

    // Switch to Register tab
    await page.getByRole('tab', { name: /register/i }).click();

    // Fill registration form
    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByPlaceholder(/^password/i).first().fill(testPassword);
    await page.getByPlaceholder(/confirm password/i).fill(testPassword);

    // Submit registration
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should redirect to verification screen
    await expect(page).toHaveURL(/verify/);
    await expect(page.locator('text=Verify Your Email')).toBeVisible();
  });

  test('should login with existing credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill login form (using test user from auth-helpers)
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to home after successful login
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 10000 });
  });

  test('should handle PIN setup flow', async ({ page, context }) => {
    // Login first
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/app\/home/);

    // Navigate to security settings
    await page.goto('/app/security');
    await expect(page.locator('text=Security Settings')).toBeVisible();

    // Check if PIN setup is available
    const pinSetupButton = page.getByRole('button', { name: /set up pin/i });
    if (await pinSetupButton.isVisible()) {
      await pinSetupButton.click();

      // Enter PIN (6 digits)
      for (let i = 0; i < 6; i++) {
        await page.locator('input[type="password"]').nth(i).fill(String(i + 1));
      }

      await page.getByRole('button', { name: /confirm/i }).click();
      await expect(page.locator('text=PIN Set Successfully')).toBeVisible();
    }
  });

  test('should validate biometric enrollment option', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/app\/home/);

    // Navigate to security
    await page.goto('/app/security');

    // Check for biometric toggle
    const biometricToggle = page.locator('text=Biometric Authentication');
    await expect(biometricToggle).toBeVisible();
  });

  test('should maintain session after page reload', async ({ page, context }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/app\/home/);

    // Reload page
    await page.reload();

    // Should still be on home page (session persisted)
    await expect(page).toHaveURL(/\/app\/home/);
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/app\/home/);

    // Open settings/profile menu
    await page.goto('/app/settings');

    // Click logout
    const logoutButton = page.getByRole('button', { name: /log out/i });
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByPlaceholder(/email/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.locator('text=/invalid credentials|authentication failed/i')).toBeVisible();
  });
});
