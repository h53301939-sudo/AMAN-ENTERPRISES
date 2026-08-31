import React, { createContext, useContext, useState, useEffect } from 'react';
import PWAInstallModal from '../components/common/PWAInstallModal';

const PWAContext = createContext({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isIOSSafari: true,
  platform: 'desktop', // 'ios' | 'android' | 'desktop'
  installApp: async () => false,
  updateAvailable: false,
  applyUpdate: () => {},
  isOnline: true,
  openInstallGuide: () => {}
});

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Platform Detection States
  const [platform, setPlatform] = useState('desktop'); // 'ios' | 'android' | 'desktop'
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // 1. Precise Platform Detection
    const userAgent = window.navigator.userAgent || '';
    const isAppleDevice = 
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const isAndroidDevice = /Android/i.test(userAgent);

    if (isAppleDevice) {
      setPlatform('ios');
      setIsIOS(true);
      const isWebKit = /WebKit/i.test(userAgent);
      const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|WhatsApp/i.test(userAgent);
      const isSafariBrowser = isWebKit && !isOtherBrowser && /Safari/i.test(userAgent);
      setIsIOSSafari(Boolean(isSafariBrowser));
    } else if (isAndroidDevice) {
      setPlatform('android');
      setIsIOS(false);
    } else {
      setPlatform('desktop'); // Windows, macOS Desktop, Linux
      setIsIOS(false);
    }

    // 2. Check if already running in Standalone / Installed PWA Mode
    const checkInstalled = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(Boolean(isStandaloneMode));
    };

    checkInstalled();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => setIsInstalled(e.matches);
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // 3. Capture Browser `beforeinstallprompt` event (Chrome, Edge on Windows/Mac & Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent default mini-infobar
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('✅ [PWA] Ready for native install prompt on', platform);
    };

    // 4. Listen for successful install
    const handleAppInstalled = () => {
      console.log('🎉 [PWA] App installed successfully');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Online/Offline Network Status Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 6. Register Service Worker with Proactive Auto-Update Engine
    let updateInterval;
    const checkForUpdates = (registration) => {
      if (registration && navigator.onLine) {
        registration.update().catch((err) => {
          console.warn('[PWA] Background update check failed:', err);
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { 
          scope: '/',
          updateViaCache: 'none' // ALWAYS fetch sw.js directly from network (no browser cache)
        })
        .then((registration) => {
          setSwRegistration(registration);

          // If there's already a waiting worker, activate it immediately
          if (registration.waiting) {
            console.log('⚡ [PWA] Activating waiting worker immediately');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // Listen for new incoming Service Worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('⚡ [PWA] New update installed! Auto-activating immediately...');
                    // Auto-activate immediately without waiting for manual toast click
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    setUpdateAvailable(true);
                  }
                }
              };
            }
          };

          // 🔄 Check for updates immediately upon startup
          checkForUpdates(registration);

          // 🔄 Check for updates on every window focus & app resume (PWA Standalone Window)
          const handleWindowFocus = () => checkForUpdates(registration);
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              checkForUpdates(registration);
            }
          };

          window.addEventListener('focus', handleWindowFocus);
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // 🔄 Background periodic check every 60 seconds
          updateInterval = setInterval(() => checkForUpdates(registration), 60 * 1000);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration warning:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('🔄 [PWA] Controller changed -> Seamlessly reloading app to newest version...');
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  // 📲 Smart Installation Trigger
  const installApp = async () => {
    // If native prompt is ready (Chrome / Edge on Windows Desktop or Android)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);

        if (outcome === 'accepted') {
          setIsInstallable(false);
          setDeferredPrompt(null);
          return true;
        }
        return false;
      } catch (err) {
        console.error('[PWA] Error invoking native prompt:', err);
      }
    }

    // If no native prompt event (e.g. iOS Safari, or Desktop browser where prompt hasn't triggered yet)
    setShowGuideModal(true);
    return false;
  };

  // 🔄 Apply Update Instantly
  const applyUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  const openInstallGuide = () => setShowGuideModal(true);
  const closeInstallGuide = () => setShowGuideModal(false);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isIOSSafari,
        platform,
        installApp,
        updateAvailable,
        applyUpdate,
        isOnline,
        openInstallGuide
      }}
    >
      {children}
      {/* Universal Multi-Platform Install Guide Modal */}
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={closeInstallGuide}
        platform={platform}
        isIOSSafari={isIOSSafari}
      />
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
export default PWAContext;
