import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDevice } from './deviceDetection.ts';

test('detectDevice identifies OPPO A78 5G user agent as mobile and oppo', () => {
  const oppoUA = 'Mozilla/5.0 (Linux; Android 13; CPH2483) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const info = detectDevice(oppoUA, 360, 360, 5);

  assert.equal(info.isMobile, true);
  assert.equal(info.isAndroid, true);
  assert.equal(info.isOPPO, true);
  assert.equal(info.deviceBrand, 'oppo');
});

test('detectDevice identifies mobile Android even if browser requests desktop site (wider viewport but Android UA & touch)', () => {
  // When desktop site is requested on Chrome Android, viewport might be 980, but UA contains Android/Linux and touchPoints > 0, screenWidth is 360
  const androidDesktopSiteUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const info = detectDevice(androidDesktopSiteUA, 980, 360, 5);

  // Because screenWidth is 360 and touch points > 0, it recognizes it as mobile hardware
  assert.equal(info.isMobile, true);
});

test('detectDevice identifies standard iPhone as mobile and iOS', () => {
  const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const info = detectDevice(iphoneUA, 390, 390, 5);

  assert.equal(info.isMobile, true);
  assert.equal(info.isIOS, true);
  assert.equal(info.deviceBrand, 'ios');
});

test('detectDevice identifies desktop Chrome as non-mobile', () => {
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const info = detectDevice(desktopUA, 1440, 1440, 0);

  assert.equal(info.isMobile, false);
  assert.equal(info.isAndroid, false);
  assert.equal(info.isIOS, false);
  assert.equal(info.deviceBrand, 'desktop');
});
