import { useEffect } from 'react';

/**
 * Safe Area Polyfill for Android devices where env(safe-area-inset-*) returns 0.
 * Uses Visual Viewport API to compute real insets and exposes them as CSS variables.
 */
export function useSafeAreaPolyfill() {
  useEffect(() => {
    const updateSafeArea = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Compute bottom inset (gesture bar area)
      const bottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      
      // Compute left/right insets (curved edges)
      const left = Math.max(0, vv.offsetLeft);
      const right = Math.max(0, window.innerWidth - (vv.width + vv.offsetLeft));

      // Set CSS variables on root
      document.documentElement.style.setProperty('--vvb', `${bottom}px`);
      document.documentElement.style.setProperty('--vvl', `${left}px`);
      document.documentElement.style.setProperty('--vvr', `${right}px`);

      // Android-specific fallback: if both env() and visualViewport return 0,
      // set a minimum bottom offset to clear system bars
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid && bottom === 0) {
        document.documentElement.style.setProperty('--android-b', '24px');
      } else {
        document.documentElement.style.setProperty('--android-b', '0px');
      }
    };

    // Initial update
    updateSafeArea();
    console.info('SAFE_AREA_POLYFILLED', {
      bottom: getComputedStyle(document.documentElement).getPropertyValue('--vvb'),
      left: getComputedStyle(document.documentElement).getPropertyValue('--vvl'),
      right: getComputedStyle(document.documentElement).getPropertyValue('--vvr'),
      androidFallback: getComputedStyle(document.documentElement).getPropertyValue('--android-b')
    });

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateSafeArea);
      window.visualViewport.addEventListener('scroll', updateSafeArea);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateSafeArea);
        window.visualViewport.removeEventListener('scroll', updateSafeArea);
      }
    };
  }, []);
}
