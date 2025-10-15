import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3e2392ce491947528d0d0528c0668ead',
  appName: 'IPG Exchange',
  webDir: 'dist',
  server: {
    url: 'https://3e2392ce-4919-4752-8d0d-0528c0668ead.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  appUrlScheme: 'ismart',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    BiometricAuth: {
      androidTitle: 'Biometric Authentication',
      androidSubtitle: 'Verify your identity',
      androidConfirmationRequired: false,
      androidBiometryStrength: 2,
      androidMaxAttempts: -1,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#a855f7',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
