import { test, expect, gotoSection } from './fixtures';

test.describe('reports', () => {
  test('Reports page loads and shows Export PDF and Excel buttons', async ({
    loggedInPage: page, admin,
  }) => {
    void admin;
    await gotoSection(page, /reports & export/i);

    await expect(page.getByRole('button', { name: /export pdf/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /excel report/i })).toBeVisible();
  });

  test('clicking Excel Report either triggers a download or shows a "no data" alert', async ({
    loggedInPage: page, admin,
  }) => {
    void admin;
    await gotoSection(page, /reports & export/i);

    // Pre-arrange: the UI uses window.alert() when there is no data.
    const dialogPromise = page
      .waitForEvent('dialog', { timeout: 10_000 })
      .catch(() => null);
    const downloadPromise = page
      .waitForEvent('download', { timeout: 10_000 })
      .catch(() => null);

    await page.getByRole('button', { name: /excel report/i }).click();

    const [dialog, download] = await Promise.all([dialogPromise, downloadPromise]);
    if (dialog) {
      expect(dialog.message()).toMatch(/no data/i);
      await dialog.accept();
    } else {
      expect(download).not.toBeNull();
      expect(download!.suggestedFilename()).toMatch(/\.xlsx$/i);
    }
  });
});
