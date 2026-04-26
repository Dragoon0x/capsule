import { test, expect, type Page } from '@playwright/test';

/**
 * Console guard: any test that enables this fails on `console.error` / `console.warn`.
 * Run as a per-test fixture rather than global so we can opt-out for known-noisy cases.
 */
async function attachConsoleGuard(page: Page): Promise<() => void> {
  const errors: string[] = [];
  const onMsg = (msg: import('@playwright/test').ConsoleMessage): void => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') errors.push(`${t}: ${msg.text()}`);
  };
  page.on('console', onMsg);
  return (): void => {
    page.off('console', onMsg);
    expect(errors, `Unexpected console output:\n${errors.join('\n')}`).toHaveLength(0);
  };
}

// Ensure a clean IndexedDB between test runs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    return indexedDB.databases?.().then((dbs) => {
      for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    });
  });
});

test('app loads with welcome state', async ({ page }) => {
  const guard = await attachConsoleGuard(page);
  await page.goto('/');
  await expect(page.getByText('Welcome to Capsule')).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Capsule');
  guard();
});

test('create capsule, add text item, see in deploy preview', async ({ page }) => {
  const guard = await attachConsoleGuard(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Create capsule' }).click();
  const titleBox = page.getByRole('textbox', { name: 'Capsule title' });
  await titleBox.fill('My First Capsule');

  // Add a text item via the footer button
  await page.getByRole('button', { name: /^Text$/ }).click();

  // Edit the empty text item
  await page.getByRole('button', { name: 'Edit item' }).first().click();
  await page.locator('textarea').first().fill('Hello from Capsule');
  await page.locator('textarea').first().blur();

  // Queue for deploy via the library row checkbox
  await page.getByRole('button', { name: 'Select for deploy' }).first().click();

  // Check preview contains the text
  await expect(page.getByLabel('Compiled prompt preview')).toContainText('Hello from Capsule');
  await expect(page.getByLabel('Compiled prompt preview')).toContainText('My First Capsule');

  guard();
});

test('command palette opens with ⌘K and lists actions', async ({ page, browserName }) => {
  const guard = await attachConsoleGuard(page);
  await page.goto('/');
  const mod = browserName === 'webkit' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+KeyK`);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('New capsule')).toBeVisible();
  await page.keyboard.press('Escape');
  guard();
});

test('library persists across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create capsule' }).click();
  await page.getByRole('textbox', { name: 'Capsule title' }).fill('Persistent Capsule');
  // Let Dexie flush
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByText('Persistent Capsule')).toBeVisible();
});

test('theme toggle works', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const initialDark = await html.evaluate((el) => el.classList.contains('dark'));
  await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
  const afterDark = await html.evaluate((el) => el.classList.contains('dark'));
  expect(afterDark).not.toBe(initialDark);
});

test('tab order reaches all primary library actions', async ({ page }) => {
  await page.goto('/');
  // Focus address bar → then into app
  await page.keyboard.press('Tab');
  // Tabbing through should eventually hit Create capsule.
  let hit = false;
  for (let i = 0; i < 30; i += 1) {
    const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (name === 'Create capsule') {
      hit = true;
      break;
    }
    await page.keyboard.press('Tab');
  }
  expect(hit).toBe(true);
});
