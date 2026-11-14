import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const CACHE_RELEASE_KEY = 'HYPERTROPHY_OS_CACHE_RELEASE_V5_3';

if (typeof window !== 'undefined') {
  try {
    const applied = window.localStorage.getItem(CACHE_RELEASE_KEY);
    if (applied !== '1') {
      window.localStorage.setItem(CACHE_RELEASE_KEY, '1');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            void reg.update();
          }
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            void caches.delete(key);
          }
        }).catch(() => {});
      }
    }
  } catch {
    // Ignore storage access errors in restricted modes
  }
}

createRoot(document.getElementById('root')!).render(<App />);
