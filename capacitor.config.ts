import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ismart.ipgexchange',
  appName: 'IPG Exchange',
  webDir: 'dist',
  server: {
    url: 'https://i-smartapp.com',
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
