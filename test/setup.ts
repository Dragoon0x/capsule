import '@testing-library/jest-dom/vitest';

// Polyfill: jsdom lacks crypto.randomUUID in some environments.
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  // deterministic-ish fallback for tests
  let counter = 0;
  globalThis.crypto.randomUUID = (() => {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return () => {
      counter += 1;
      return `${counter.toString(16).padStart(8, '0')}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(
        /[xy]/g,
        (c) => (c === 'y' ? (Math.floor(Math.random() * 4) + 8).toString(16) : hex()),
      ) as `${string}-${string}-${string}-${string}-${string}`;
    };
  })();
}

// Polyfill BroadcastChannel for multitab tests (jsdom lacks it).
if (typeof globalThis.BroadcastChannel === 'undefined') {
  // Minimal in-process stub; real tests for multi-tab run under Playwright.
  class StubBC extends EventTarget {
    name: string;
    constructor(name: string) {
      super();
      this.name = name;
    }
    postMessage(_data: unknown): void {
      /* no-op in-process */
    }
    close(): void {
      /* no-op */
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).BroadcastChannel = StubBC;
}
