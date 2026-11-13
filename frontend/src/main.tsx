import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline caching and standalone installation
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] New content available, reload to update.');
  },
  onOfflineReady() {
    console.info('[PWA] App is ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
