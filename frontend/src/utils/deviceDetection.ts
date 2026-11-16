/**
 * Comprehensive Device & Environment Detection Utilities
 * Handles mobile autodetection (including Android, OPPO ColorOS, iOS, tablets, and desktop)
 * Even when mobile browsers have 'Desktop site' toggled.
 */

export interface DeviceInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isOPPO: boolean;
  isStandalone: boolean;
  deviceBrand: string;
}

export function detectDevice(
  customUA?: string,
  customWidth?: number,
  customScreenWidth?: number,
  customTouchPoints?: number
): DeviceInfo {
  if (typeof window === 'undefined' && !customUA) {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isOPPO: false,
      isStandalone: false,
      deviceBrand: 'desktop',
    };
  }

  const ua = (customUA !== undefined ? customUA : typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  const width = customWidth !== undefined ? customWidth : typeof window !== 'undefined' ? window.innerWidth : 1024;
  const screenWidth = customScreenWidth !== undefined ? customScreenWidth : typeof window !== 'undefined' && window.screen ? window.screen.width : 1024;
  const touchPoints = customTouchPoints !== undefined ? customTouchPoints : typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;

  // Specific Android / OPPO / iOS patterns
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isOPPO = /oppo|cph\d+|p[a-z]{2}\d+|coloros/i.test(ua);

  // Standalone PWA detection
  let isStandalone = false;
  if (typeof window !== 'undefined') {
    isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      Boolean(document.referrer && document.referrer.includes('android-app://'));
  }

  // Mobile detection logic:
  // 1. Explicit mobile user agent
  const isMobileUA = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini|crios/i.test(ua);
  // 2. Physical screen width < 768px (reliable even if browser is set to "request desktop site")
  const isSmallScreen = screenWidth < 768 || width < 768;
  // 3. Touch device with moderate screen size (< 1024px)
  const isTouchDevice = touchPoints > 0 && (screenWidth < 1024 || width < 1024);

  const isMobile = isMobileUA || isSmallScreen || (isAndroid && touchPoints > 0) || (isIOS && touchPoints > 0);

  let deviceBrand = 'desktop';
  if (isOPPO) deviceBrand = 'oppo';
  else if (isAndroid) deviceBrand = 'android';
  else if (isIOS) deviceBrand = 'ios';
  else if (isMobile) deviceBrand = 'mobile';

  return {
    isMobile,
    isAndroid,
    isIOS,
    isOPPO,
    isStandalone,
    deviceBrand,
  };
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    Boolean(document.referrer && document.referrer.includes('android-app://'))
  );
}
