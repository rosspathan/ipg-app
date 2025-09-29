/**
 * ASTRA DESIGN SYSTEM - Core Tokens
 * Premium dark UI with high contrast and neon accents
 */

export const astraTokens = {
  // Brand Colors (HSL for precision)
  colors: {
    primary: {
      DEFAULT: '248 67% 64%', // #8853FF
      glow: '248 100% 90%',
      foreground: '0 0% 98%',
    },
    accent: {
      DEFAULT: '186 100% 50%', // #00E5FF  
      glow: '186 100% 80%',
      foreground: '0 0% 8%',
    },
    success: {
      DEFAULT: '154 67% 52%', // #2BD67B
      foreground: '0 0% 98%',
    },
    warning: {
      DEFAULT: '35 85% 60%', // #F7A53B
      foreground: '0 0% 98%',
    },
    danger: {
      DEFAULT: '0 70% 68%', // #FF5C5C
      foreground: '0 0% 98%',
    },
    // Dark Background System
    background: {
      primary: '222 39% 7%', // #0C0F14
      secondary: '225 34% 9%', // #0E1220
      foreground: '0 0% 98%',
    },
    card: {
      primary: '223 32% 11%', // #121624
      secondary: '223 30% 13%', // #141A2A
      glass: 'rgba(18, 22, 36, 0.7)',
      foreground: '0 0% 98%',
    },
    border: {
      DEFAULT: '217 24% 18%', // #2A2F42
      subtle: '217 30% 14%', // #1C2233
    },
    text: {
      primary: '0 0% 98%',
      secondary: '0 0% 70%',
      muted: '0 0% 45%',
    }
  },

  // Typography Scale
  typography: {
    fonts: {
      heading: '"Space Grotesk", system-ui, sans-serif',
      body: '"Inter", system-ui, sans-serif', 
      mono: '"JetBrains Mono", monospace',
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },

  // Spacing System (4/8pt grid)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // Border Radius
  radius: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    pill: '999px',
  },

  // Shadows & Elevation
  shadows: {
    card: '0 8px 32px rgba(136, 83, 255, 0.22)',
    elevated: '0 12px 48px rgba(0, 229, 255, 0.18)',
    button: '0 4px 16px rgba(136, 83, 255, 0.3)',
    neon: '0 0 20px rgba(136, 83, 255, 0.4)',
    fab: '0 8px 24px rgba(0, 229, 255, 0.3)',
  },

  // Motion & Timing
  motion: {
    durations: {
      micro: '120ms',
      fast: '120ms', 
      standard: '220ms',
      slow: '320ms',
    },
    easings: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      entrance: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, hsl(248 67% 64%), hsl(248 100% 75%))',
    background: 'linear-gradient(135deg, hsl(222 39% 7%), hsl(225 34% 9%))',
    card: 'linear-gradient(135deg, rgba(18, 22, 36, 0.8), rgba(20, 26, 42, 0.6))',
    neon: 'linear-gradient(90deg, hsl(186 100% 50%), hsl(248 67% 64%))',
    ring: 'conic-gradient(from 0deg, hsl(186 100% 50%), hsl(248 67% 64%), hsl(186 100% 50%))',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
  },

  // Z-Index Stack
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  }
} as const;

export type AstraTokens = typeof astraTokens;