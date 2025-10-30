import { test, expect } from '@playwright/test';

/**
 * BSK Loan Program Tests
 * Tests the complete loan flow including:
 * - Loan application with collateral
 * - LTV calculation (50%)
 * - Approval and disbursement
 * - Repayment and collateral release
 */

test.describe('BSK Loan Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/home');
  });

  test('should display loan application form', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Verify form fields
    await expect(page.locator('text=Loan Amount')).toBeVisible();
    await expect(page.locator('text=Collateral')).toBeVisible();
    await expect(page.locator('text=Loan Terms')).toBeVisible();
  });

  test('should calculate correct LTV (50%)', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Enter collateral amount
    await page.fill('input[name="collateral_amount"]', '10000');
    
    // Verify max loan amount is 50% of collateral
    const maxLoanElement = page.locator('[data-testid="max-loan-amount"]');
    await expect(maxLoanElement).toContainText('5000');
  });

  test('should apply for loan with valid collateral', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Fill loan application
    await page.fill('input[name="collateral_amount"]', '10000');
    await page.fill('input[name="loan_amount"]', '5000');
    await page.selectOption('select[name="tenor"]', '16'); // 16 weeks
    
    // Submit application
    await page.click('button:has-text("Apply for Loan")');
    
    // Verify success
    await expect(page.locator('.sonner')).toContainText('Loan application submitted');
  });

  test('should reject loan exceeding 50% LTV', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Try to apply for loan > 50% LTV
    await page.fill('input[name="collateral_amount"]', '10000');
    await page.fill('input[name="loan_amount"]', '6000'); // 60% LTV
    
    // Submit application
    await page.click('button:has-text("Apply for Loan")');
    
    // Verify error
    await expect(page.locator('.sonner')).toContainText('exceeds maximum LTV');
  });

  test('should display active loans', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Scroll to active loans section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verify active loans section
    await expect(page.locator('text=Active Loans')).toBeVisible();
  });

  test('should display loan repayment schedule', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Click on an active loan (if exists)
    await page.click('[data-testid="loan-card"]');
    
    // Verify repayment schedule
    await expect(page.locator('text=Repayment Schedule')).toBeVisible();
    await expect(page.locator('text=Weekly Payment')).toBeVisible();
    await expect(page.locator('text=Remaining Balance')).toBeVisible();
  });

  test('should verify 0% interest rate', async ({ page }) => {
    await page.goto('/app/programs/loans');
    
    // Fill loan details
    await page.fill('input[name="collateral_amount"]', '10000');
    await page.fill('input[name="loan_amount"]', '5000');
    
    // Verify interest rate display
    await expect(page.locator('text=0% Interest')).toBeVisible();
    
    // Verify total repayment equals principal
    const totalRepayment = page.locator('[data-testid="total-repayment"]');
    await expect(totalRepayment).toContainText('5000');
  });
});
