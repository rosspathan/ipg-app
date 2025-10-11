import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapApp, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle deep linking in the mobile app
 * Supports:
 * - https://i-smartapp.com/r/:code (referral links)
 * - ismart://referral/:code (custom scheme)
 * - ismart://... (other deep links)
 */
export function useDeepLinking() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only setup deep linking on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: any = null;

    const setupDeepLinking = async () => {
      // Handle app launch with URL
      const launchUrlResult = await CapApp.getLaunchUrl();
      if (launchUrlResult?.url) {
        handleDeepLink(launchUrlResult.url);
      }

      // Listen for app URL open events
      listenerHandle = await CapApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        handleDeepLink(event.url);
      });
    };

    setupDeepLinking();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);

  const handleDeepLink = (url: string) => {
    console.log('🔗 Deep link opened:', url);

    try {
      const urlObj = new URL(url);

      // Handle referral links: https://i-smartapp.com/r/:code
      if (urlObj.host === 'i-smartapp.com' && urlObj.pathname.startsWith('/r/')) {
        const code = urlObj.pathname.split('/r/')[1];
        if (code) {
          console.log('📨 Referral code from deep link:', code);
          navigate(`/r/${code}`);
          return;
        }
      }

      // Handle custom scheme: ismart://referral/:code
      if (urlObj.protocol === 'ismart:' && urlObj.host === 'referral') {
        const code = urlObj.pathname.replace('/', '');
        if (code) {
          console.log('📨 Referral code from custom scheme:', code);
          navigate(`/r/${code}`);
          return;
        }
      }

      // Handle other ismart:// deep links
      if (urlObj.protocol === 'ismart:') {
        const path = urlObj.host + urlObj.pathname;
        console.log('🔗 Custom app link:', path);
        navigate(`/${path}`);
        return;
      }

      console.warn('Unhandled deep link:', url);
    } catch (error) {
      console.error('Error parsing deep link:', error);
    }
  };

  return { handleDeepLink };
}
