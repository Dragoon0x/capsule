import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    return indexedDB.databases?.().then((dbs) => {
      for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    });
  });
});

test('share a capsule via URL hash round-trips into another tab', async ({ page, context }) => {
  await page.goto('/');

  // Create a capsule
  await page.getByRole('button', { name: 'Create capsule' }).click();
  await page.getByRole('textbox', { name: 'Capsule title' }).fill('Shared Capsule');
  await page.getByRole('button', { name: /^Text$/ }).click();
  await page.getByRole('button', { name: 'Edit item' }).first().click();
  await page.locator('textarea').first().fill('Share payload content');
  await page.locator('textarea').first().blur();

  // Open share dialog from editor header
  await page.getByRole('button', { name: 'Share capsule' }).click();

  // Copy URL link
  await page.getByRole('button', { name: /Copy link/ }).click();

  // Read the copied URL from clipboard
  const url = await page.evaluate(async () => navigator.clipboard.readText());
  expect(url).toContain('#s=');

  // Open in a fresh page with cleared storage
  const page2 = await context.newPage();
  await page2.addInitScript(() => {
    return indexedDB.databases?.().then((dbs) => {
      for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    });
  });
  await page2.goto(url);
  await expect(page2.getByText('Shared Capsule')).toBeVisible();
});
