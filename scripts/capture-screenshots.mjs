/**
 * Screenshot capture for the README.
 *
 * Boots a Chromium against the dev server, walks through key states,
 * saves PNGs under docs/screenshots/.
 *
 * Usage:
 *   1. npm run dev  (in another terminal — must serve at http://localhost:5173)
 *   2. node scripts/capture-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, '..', 'docs', 'screenshots');
const URL = process.env.URL ?? 'http://localhost:5173';

const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${name}.png`);
}

async function clearDb(page) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    }
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
}

async function setTheme(page, mode) {
  await page.evaluate((m) => {
    const root = document.documentElement;
    if (m === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('capsule:theme', m);
  }, mode);
  await page.waitForTimeout(150);
}

async function dismissOnboarding(page) {
  await page.evaluate(() => {
    const skip = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Skip');
    skip?.click();
  });
  await page.waitForTimeout(150);
}

async function paste(page, text) {
  await page.evaluate((t) => {
    const zone = document.querySelector('[aria-label="Capsule editor drop zone — paste or drag content"]');
    if (!zone) return;
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    zone.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);
  await page.waitForTimeout(150);
}

const TS_CODE = `// pull request: refactor session middleware to JWT
import { verify } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
  exp: number;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    const payload = await verifyJwt<JwtPayload>(token);
    req.user = { id: payload.userId };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}`;

const NOTES = `## Migration goal

Move from cookie sessions to short-lived JWTs.

**Constraints**
- 15min access token, 7d refresh token
- Rotate refresh tokens on each use
- Backwards-compatible cookie reader for one release

Reference: [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ----- 1. Welcome (light) -----
  await clearDb(page);
  await setTheme(page, 'light');
  await dismissOnboarding(page);
  await page.waitForTimeout(300);
  await shot(page, '01-welcome-light');

  // ----- 2. Welcome (dark) -----
  await setTheme(page, 'dark');
  await page.waitForTimeout(200);
  await shot(page, '02-welcome-dark');

  // ----- 3. Templates dialog (dark) -----
  await page.evaluate(() => {
    const tpl = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Templates');
    tpl?.click();
  });
  await page.waitForTimeout(400);
  await shot(page, '03-templates-dialog');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ----- 4. Populated workspace (light) — fork Code review template, paste TS code -----
  await setTheme(page, 'light');
  await page.evaluate(() => {
    const tpl = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Templates');
    tpl?.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const cards = document.querySelectorAll('[role="button"]');
    for (const c of cards) {
      if (c.textContent?.includes('Code review')) {
        c.click();
        return;
      }
    }
  });
  await page.waitForTimeout(600);
  await paste(page, TS_CODE);
  await page.waitForTimeout(400);

  // Queue the active capsule for deploy
  await page.evaluate(() => {
    const cb = document.querySelector('button[aria-label="Select for deploy"]');
    cb?.click();
  });
  // Set the task and language variable
  await page.evaluate(() => {
    const setVal = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        ?? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setVal('textarea[placeholder="What do you want the model to do?"]', 'Review this PR. Use the rubric. Flag risks; suggest tests.');
    setTimeout(() => {
      const input = Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'value');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'TypeScript');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 50);
  });
  await page.waitForTimeout(800);
  await shot(page, '04-populated-light');

  // ----- 5. Same view, dark mode -----
  await setTheme(page, 'dark');
  await page.waitForTimeout(300);
  await shot(page, '05-populated-dark');

  // ----- 6. Code block close-up (scroll editor down) -----
  await page.evaluate(() => {
    const scroll = document.querySelector('main .overflow-y-auto');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
  await page.waitForTimeout(300);
  await shot(page, '06-syntax-highlight');

  // ----- 7. Keyboard shortcuts dialog -----
  await page.keyboard.press('?');
  await page.waitForTimeout(400);
  await shot(page, '07-shortcuts');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ----- 8. Command palette -----
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(400);
  await shot(page, '08-command-palette');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ----- 9. Markdown rendering (replace text item with markdown) -----
  await setTheme(page, 'light');
  await page.evaluate(() => {
    const scroll = document.querySelector('main .overflow-y-auto');
    if (scroll) scroll.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  // Add a markdown text item via paste
  await paste(page, NOTES);
  await page.waitForTimeout(500);
  await shot(page, '09-markdown-preview');

  await browser.close();
  console.log(`\nWrote screenshots to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
