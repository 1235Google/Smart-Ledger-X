import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Immediate safety fix: unregister service workers so stale or broken caches never break page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      reg.unregister().catch((err) => {
        console.warn('[PWA] Service worker unregister error:', err);
      });
    });
  }).catch((err) => {
    console.warn('[PWA] Could not get service worker registrations:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

