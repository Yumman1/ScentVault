import { test, expect, loginViaUi } from './fixtures';
import { TEST_ENV } from '../env';

test.describe('auth', () => {
  test('admin can log in and sees the dashboard', async ({ page, admin }) => {
    void admin;
    await loginViaUi(page, TEST_ENV.adminEmail, TEST_ENV.adminPassword);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('you@company.com').fill(TEST_ENV.adminEmail);
    await page.getByPlaceholder('••••••••').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('body')).toContainText(/invalid|incorrect|credentials|password/i);
    await expect(page.getByRole('link', { name: /dashboard/i })).not.toBeVisible();
  });

  test('sign out returns to login and page reload does NOT auto-login', async ({ page, admin }) => {
    void admin;
    await loginViaUi(page, TEST_ENV.adminEmail, TEST_ENV.adminPassword);

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();

    // Persistence is disabled in lib/supabase.ts (persistSession=false).
    await page.reload();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).not.toBeVisible();
  });
});
