import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global version control and Service Worker update listener
let currentVersion = null;

const checkVersion = async () => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (!currentVersion) {
        currentVersion = data.version; // Initialize
      } else if (currentVersion !== data.version) {
        console.log('New version detected! Forcing reload...');
        
        // 1. Unregister all Service Workers
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
          } catch(e) {
            console.error('Error unregistering SW', e);
          }
        }

        // 2. Clear all Caches
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          } catch(e) {
            console.error('Error clearing caches', e);
          }
        }
        
        // 3. Force Hard Reload safely for PWAs
        document.body.innerHTML = '<div style="height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #000; color: #fff; font-family: sans-serif; font-size: 1.2rem; font-weight: bold;">Actualizando aplicación...</div>';
        setTimeout(() => {
          window.location.replace(window.location.href);
        }, 500);
      }
    }
  } catch (err) {
    console.error('Failed to check version', err);
  }

  // Force the Service Worker itself to check for updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.update();
    });
  }
};

// Check version immediately, then every 2 minutes
checkVersion();
setInterval(checkVersion, 120000);

// Listen for service worker updates (when autoUpdate activates a new SW)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('Service Worker controller changed! Forcing reload...');
    document.body.innerHTML = '<div style="height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #000; color: #fff; font-family: sans-serif; font-size: 1.2rem; font-weight: bold;">Actualizando aplicación...</div>';
    setTimeout(() => {
      window.location.replace(window.location.href);
    }, 500);
  });
}

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
