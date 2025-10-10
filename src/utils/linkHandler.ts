import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Opens a URL appropriately based on the platform
 * - In mobile app: Opens in in-app browser
 * - In web: Opens in new tab
 */
export const openUrl = async (url: string, target: '_blank' | '_self' = '_blank') => {
  if (!url) return;

  // Check if running as a native mobile app
  if (Capacitor.isNativePlatform()) {
    try {
      // Open in in-app browser (stays within app)
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch (error) {
      console.error('Error opening URL in in-app browser:', error);
      // Fallback to external browser
      window.open(url, target);
    }
  } else {
    // Web platform - use normal window.open
    window.open(url, target, 'noopener,noreferrer');
  }
};

/**
 * Checks if a URL is external (not part of the app)
 */
export const isExternalUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a relative URL
  if (url.startsWith('/') || url.startsWith('#')) {
    return false;
  }
  
  // Check if it's an absolute URL with a different domain
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Gets the current platform
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Checks if running in a native mobile app
 */
export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};
