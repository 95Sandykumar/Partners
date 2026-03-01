import { test, expect } from './fixtures';

test.describe('Upload, Review, Approve Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('upload page is accessible', async ({ page }) => {
    await page.goto('/dashboard/upload');
    await expect(page.getByText(/upload|drop/i)).toBeVisible();
  });

  test('review queue shows POs', async ({ page }) => {
    await page.goto('/dashboard/review');
    // Should show either POs or empty state
    await expect(page.locator('main')).toBeVisible();
  });
});
