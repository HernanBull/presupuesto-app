import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global version control and aggressive Service Worker update listener
const APP_BUILD_KEY = 'axon_installed_version';

window.__axonPurgeCache = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    } catch(e) {}
  }
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch(e) {}
  }
  window.location.reload();
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Axon] Error en carga diferida de módulo. Recargando aplicación...');
  window.location.reload();
});

const checkVersion = async () => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const storedVersion = localStorage.getItem(APP_BUILD_KEY);

      if (storedVersion && storedVersion !== data.version) {
        console.log(`[AxonPWA] Versión nueva detectada (${storedVersion} -> ${data.version}). Sincronizando...`);
        localStorage.setItem(APP_BUILD_KEY, data.version);
        
        // 1. Unregister all Service Workers
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
          } catch(e) {}
        }

        // 2. Clear all Caches
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          } catch(e) {}
        }
        
        // 3. Recargar suavemente a la nueva versión
        window.location.reload();
        return;
      }

      if (!storedVersion) {
        localStorage.setItem(APP_BUILD_KEY, data.version);
      }
    }
  } catch (err) {
    console.warn('Failed to check version', err);
  }

  // Force the Service Worker itself to check for updates cleanly without throwing unhandled rejection
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        reg.update().catch(() => {});
      }
    }).catch(() => {});
  }
};

// Check version immediately, then every 20 seconds
checkVersion();
setInterval(checkVersion, 20000);

// Listen for service worker updates (when autoUpdate activates a new SW)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[AxonPWA] Service Worker controller changed! Forcing reload...');
    window.location.reload();
  });
}

// Global PWA install prompt capture
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPwaPrompt = e;
  window.dispatchEvent(new CustomEvent('axon-pwa-prompt-available', { detail: e }));
});

window.addEventListener('appinstalled', () => {
  window.deferredPwaPrompt = null;
  window.dispatchEvent(new Event('axon-pwa-app-installed'));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Remove splash screen after initial render
setTimeout(() => {
  const splash = document.getElementById('axon-splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }
}, 800);
