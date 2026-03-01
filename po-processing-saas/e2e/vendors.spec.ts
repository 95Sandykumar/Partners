import { test, expect } from './fixtures';

test.describe('Vendors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('vendors page loads', async ({ page }) => {
    await page.goto('/dashboard/vendors');
    await expect(page.locator('main')).toBeVisible();
  });
});
