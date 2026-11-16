import { useEffect, useState } from 'react';
import { detectDevice, isStandalonePWA } from '../utils/deviceDetection';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isOPPO, setIsOPPO] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    // Genuine standalone mode check (never fake or assume)
    setIsInstalled(isStandalonePWA());

    // Hardware & OS detection
    const info = detectDevice();
    setIsIOS(info.isIOS);
    setIsAndroid(info.isAndroid);
    setIsOPPO(info.isOPPO);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' | 'guide_opened' }> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          // Note: Do not set isInstalled=true here.
          // The browser fires 'appinstalled' when installation finishes,
          // and standalone check verifies when user actually opens the PWA.
          setDeferredPrompt(null);
          return { outcome: 'accepted' };
        }
        return { outcome: 'dismissed' };
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowInstallGuide(true);
        return { outcome: 'guide_opened' };
      }
    } else {
      // If beforeinstallprompt hasn't fired yet or device requires manual install
      setShowInstallGuide(true);
      return { outcome: 'guide_opened' };
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isOPPO,
    showInstallGuide,
    setShowInstallGuide,
    install,
  };
}
