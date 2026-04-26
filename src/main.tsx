import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { App } from './app/App';
import './styles/tailwind.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found. Check index.html.');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker auto-update with in-app notification.
// We surface the "new version available" via a custom event the App listens to.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('capsule:sw-update'));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('capsule:sw-offline-ready'));
  },
});

// Expose update function for the toast to call.
declare global {
  interface Window {
    __capsuleUpdateSW?: () => Promise<void>;
  }
}
window.__capsuleUpdateSW = async () => {
  await updateSW(true);
};
