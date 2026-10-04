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
        // Clear caches to ensure new assets are fetched
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        }
        window.location.reload(true);
      }
    }
  } catch (err) {
    console.error('Failed to check version', err);
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
    window.location.reload(true);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
