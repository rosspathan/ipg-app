/**
 * Clean Admin Design System - Professional & Minimal
 * World-class UX with high contrast and clarity
 */

export const adminCleanTokens = {
  colors: {
    // Background System - Pure Dark
    background: {
      primary: "220 13% 4%",      // #0A0B0D - Main background
      secondary: "220 13% 7%",    // #111318 - Card background
      tertiary: "220 13% 10%",    // #1A1D24 - Elevated cards
      hover: "220 13% 12%",       // #1E2128 - Hover state
    },
    
    // Border System - Subtle
    border: {
      default: "220 13% 14%",     // #22252B - Default border
      subtle: "220 13% 14% / 0.4", // Subtle borders
      focus: "262 100% 65%",      // Focus ring (purple)
    },
    
    // Text System - High Contrast
    text: {
      primary: "0 0% 98%",        // #FAFAFA - Primary text
      secondary: "220 9% 65%",    // #9CA3AF - Secondary text
      muted: "220 9% 46%",        // #6B7280 - Muted text
      inverse: "220 13% 4%",      // Dark text on light bg
    },
    
    // Interactive - Purple Accent
    interactive: {
      primary: "262 100% 65%",    // #7C4DFF - Primary actions
      hover: "262 100% 70%",      // #8F5FFF - Hover state
      active: "262 100% 60%",     // #6A3FFF - Active state
    },
    
    // Status Colors
    status: {
      success: "152 64% 48%",     // #2BD67B - Success
      warning: "33 93% 60%",      // #F7A53B - Warning
      danger: "0 84% 60%",        // #EF4444 - Danger
      info: "217 91% 60%",        // #3B82F6 - Info
    }
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      heading: "'Space Grotesk', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
    },
    fontSize: {
      display: "1.75rem",         // 28px - Page titles
      h1: "1.25rem",              // 20px - Section titles
      h2: "1rem",                 // 16px - Card titles
      body: "0.875rem",           // 14px - Body text
      caption: "0.75rem",         // 12px - Labels
    },
    fontWeight: {
      bold: "700",
      semibold: "600",
      medium: "500",
      regular: "400",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.75",
    }
  },
  
  // Spacing Scale (4px base unit)
  spacing: {
    xs: "0.25rem",      // 4px
    sm: "0.5rem",       // 8px
    md: "0.75rem",      // 12px
    lg: "1rem",         // 16px
    xl: "1.5rem",       // 24px
    "2xl": "2rem",      // 32px
    "3xl": "3rem",      // 48px
  },
  
  // Border Radius
  radius: {
    sm: "0.5rem",       // 8px
    md: "0.75rem",      // 12px
    lg: "1rem",         // 16px
    full: "9999px",     // Pill shape
  },
  
  // Shadows - Minimal
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
  
  // Transitions
  motion: {
    duration: {
      fast: "150ms",
      base: "200ms",
      slow: "300ms",
    },
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  }
} as const;

export type AdminCleanTokens = typeof adminCleanTokens;
