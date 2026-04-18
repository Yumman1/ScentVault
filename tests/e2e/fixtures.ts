import { test as base, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TEST_ENV } from '../env';
import { signInAdmin, wipeAll } from '../helpers/db';

type Fixtures = {
  admin: SupabaseClient;
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
  admin: async ({}, use) => {
    const admin = await signInAdmin();
    await use(admin.client);
  },
  loggedInPage: async ({ page, admin }, use) => {
    // Ensure a clean slate for every test.
    await wipeAll(admin);
    await loginViaUi(page, TEST_ENV.adminEmail, TEST_ENV.adminPassword);
    await use(page);
  },
});

export { expect };

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('you@company.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // The header/sidebar appears only after login succeeds.
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible({ timeout: 30_000 });
}

export async function gotoSection(page: Page, label: RegExp) {
  await page.getByRole('link', { name: label }).click();
}

/**
 * Fill a labelled Input by its <label> text. Works because Input.tsx uses
 * htmlFor + id linking.
 */
export async function fillLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
}

/**
 * Select an option in a labelled Select by its <label> text.
 */
export async function selectLabel(page: Page, label: string, optionLabelOrValue: string) {
  const el = page.getByLabel(label, { exact: true });
  await el.selectOption({ label: optionLabelOrValue }).catch(async () => {
    await el.selectOption(optionLabelOrValue);
  });
}
