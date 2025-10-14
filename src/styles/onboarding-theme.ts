/**
 * Unified design system for onboarding screens
 * Use these constants to ensure consistency across all onboarding UI
 */

export const OnboardingTheme = {
  // Gradient backgrounds
  gradients: {
    primary: 'from-slate-900 via-purple-900 to-slate-900',
    secondary: 'from-purple-900 via-indigo-900 to-slate-900',
    success: 'from-emerald-900 via-purple-900 to-slate-900',
    warning: 'from-yellow-900 via-orange-900 to-slate-900',
    error: 'from-red-900 via-pink-900 to-slate-900',
  },

  // Card variants
  cards: {
    glass: 'bg-white/10 backdrop-blur-sm border border-white/20',
    glassDark: 'bg-white/5 backdrop-blur-sm border border-white/10',
    glassHover: 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 hover:border-white/30',
    gradient: 'bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20',
    
    // Colored accent cards
    success: 'bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm',
    warning: 'bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm',
    danger: 'bg-red-500/10 border border-red-500/20 backdrop-blur-sm',
    info: 'bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm',
  },

  // Button styles (use with Button component variant/className)
  buttons: {
    // Primary CTA - Blue to Cyan gradient
    primary: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl',
    
    // Secondary CTA - Purple to Pink gradient
    secondary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-2xl',
    
    // Success - Green gradient
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl',
    
    // Outline/Ghost
    outline: 'border-white/30 hover:bg-white/10 text-white rounded-2xl',
    ghost: 'hover:bg-white/10 text-white rounded-xl',
    
    // Danger
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-2xl',
  },

  // Typography
  typography: {
    title: 'text-2xl font-bold text-white',
    subtitle: 'text-base text-white/80',
    body: 'text-sm text-white/70',
    label: 'text-xs text-white/60',
    error: 'text-sm text-destructive',
    success: 'text-sm text-emerald-400',
  },

  // Spacing & Layout
  spacing: {
    safeAreaTop: 'max(env(safe-area-inset-top), 16px)',
    safeAreaBottom: 'max(env(safe-area-inset-bottom), 16px)',
    contentPadding: 'px-6',
    sectionGap: 'space-y-6',
    cardPadding: 'p-6',
  },

  // Animations
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
  },

  // Touch targets (minimum sizes)
  touchTargets: {
    icon: 'min-w-[44px] min-h-[44px]',
    button: 'min-h-[44px]',
  },
} as const;

// Onboarding flow step mapping
export const OnboardingSteps = {
  WELCOME: { step: 1, name: 'Welcome', total: 8 },
  WALLET_CHOICE: { step: 2, name: 'Wallet Choice', total: 8 },
  CREATE_WALLET: { step: 3, name: 'Create Wallet', total: 8 },
  BACKUP_PHRASE: { step: 4, name: 'Backup Phrase', total: 8 },
  EMAIL_VERIFICATION: { step: 5, name: 'Email Verification', total: 8 },
  PIN_SETUP: { step: 6, name: 'PIN Setup', total: 8 },
  BIOMETRIC_SETUP: { step: 7, name: 'Biometric', total: 8 },
  COMPLETE: { step: 8, name: 'Complete', total: 8 },
} as const;
