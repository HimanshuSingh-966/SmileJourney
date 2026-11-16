import React, { useState } from 'react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid?: boolean;
  isOPPO?: boolean;
  onNativeInstallClick?: () => void;
  isInstallable: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isAndroid = false,
  isOPPO = false,
  onNativeInstallClick,
  isInstallable,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-ipjysh26c5aewjdgvqzfnp-728586522733.asia-northeast1.run.app';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentAppUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#201c19] rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">install_mobile</span>
            </div>
            <div>
              <h3
                id="pwa-install-modal-title"
                className="font-editorial text-lg font-semibold text-[#1f1b18] dark:text-[#f7eee9]"
              >
                Install SmileJourneyAI
              </h3>
              <p className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                Save to your phone home screen &amp; app drawer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f5ece7] dark:hover:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] cursor-pointer"
            aria-label="Close install dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 1-Click Native Install Button (when browser supports deferred prompt) */}
        {isInstallable ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ffdcc6]/60 to-[#fbf2ed] dark:from-[#3a281e] dark:to-[#24201d] flex flex-col gap-2.5 border border-[#e08744]/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#206a50] animate-ping"></span>
              <p className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                1-Click Direct Installation Ready
              </p>
            </div>
            <p className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Your browser supports direct installation. Tap below to prompt your device launcher.
            </p>
            <button
              type="button"
              onClick={onNativeInstallClick}
              className="w-full py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
              <span>Trigger Device Install Prompt</span>
            </button>
          </div>
        ) : null}

        {/* If inside an iframe / preview window notice */}
        {isInsideIframe && (
          <div className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#282420] border border-[#e08744]/30 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[#934b08] dark:text-[#ffb785] text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>Preview Window Detected</span>
            </div>
            <p className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Android security prevents native install prompts inside preview frames. Open the app directly in Chrome to install to your phone's home screen with one tap:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={currentAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-full bg-[#206a50] hover:bg-[#18533e] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs text-center"
              >
                <span className="material-symbols-outlined text-[16px]">launch</span>
                <span>Open in Chrome Tab</span>
              </a>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="py-2.5 px-3 rounded-full bg-[#f5ece7] dark:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#ebdcd3] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Specialized Guidance Cards */}
        <div className="flex flex-col gap-3 text-xs text-[#544339] dark:text-[#b5a499]">
          {/* OPPO / Android Detailed Card */}
          {(isAndroid || isOPPO || !isIOS) && (
            <div className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-2.5 border border-[#e08744]/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1f1b18] dark:text-[#f7eee9] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#e08744]">
                    smartphone
                  </span>
                  <span>OPPO &amp; Android Home Screen Guide</span>
                </span>
                {isOPPO && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] font-bold">
                    OPPO / ColorOS
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 text-[11px] leading-relaxed">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1f1b18] border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-1.5">
                  <span className="font-bold text-[#1f1b18] dark:text-[#f7eee9]">
                    1. In Google Chrome (Recommended):
                  </span>
                  <p>
                    Tap the <strong>3 dots menu (⋮)</strong> in Chrome's top-right corner &gt; Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1f1b18] border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-1.5">
                  <span className="font-bold text-[#934b08] dark:text-[#ffb785] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>Where to find it on OPPO / ColorOS:</span>
                  </span>
                  <p>
                    By default on OPPO phones, newly installed apps are placed into the <strong>App Drawer</strong>!
                  </p>
                  <ul className="list-disc pl-4 flex flex-col gap-1 text-[10.5px]">
                    <li><strong>Swipe up</strong> from the bottom of your home screen to open the App Drawer. Search for <strong>"SmileJourney"</strong>.</li>
                    <li>To show new apps on your main screen: Go to phone <strong>Settings &gt; Home Screen &amp; Lock Screen &gt; Enable "Add apps to Home screen"</strong>.</li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1f1b18] border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-1">
                  <span className="font-bold text-[#1f1b18] dark:text-[#f7eee9]">
                    2. In OPPO HeyTap Browser:
                  </span>
                  <p>
                    Tap the bottom menu icon <strong>(≡)</strong> &gt; Select <strong>"Tools"</strong> &gt; Tap <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* iPhone / iPad (Safari) Card */}
          {isIOS && (
            <div className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-2.5 border border-[#dac2b4]/30 dark:border-[#38332e]">
              <span className="font-semibold text-[#1f1b18] dark:text-[#f7eee9] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#934b08] dark:text-[#ffb785]">
                  apple
                </span>
                On iPhone &amp; iPad (Safari)
              </span>
              <ol className="list-decimal pl-4 flex flex-col gap-2 text-[11px] leading-relaxed">
                <li>
                  Tap the <strong>Share</strong> button (box with upward arrow) in Safari.
                </li>
                <li>
                  Scroll down and tap <strong>"Add to Home Screen"</strong> (+ icon).
                </li>
                <li>
                  Tap <strong>"Add"</strong> in the top-right corner.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full py-2.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] text-xs font-semibold cursor-pointer hover:bg-[#eae1dc] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
