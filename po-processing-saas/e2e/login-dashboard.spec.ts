import { test, expect } from './fixtures';

test.describe('Login and Dashboard', () => {
  test('navigates to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login and verify dashboard loads', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    // Assumes authenticated via stored cookies or login
    await page.goto('/dashboard');
    const sidebarLinks = page.getByRole('navigation').getByRole('link');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
