/**
 * Nova Admin Design System - Design Tokens
 * High-contrast dark purple theme for admin console
 */

export const novaAdminTokens = {
  colors: {
    // Brand Colors (HSL for precision)
    primary: "262 100% 65%",      // #7C4DFF
    secondary: "270 100% 71%",    // #A66CFF
    accent: "187 100% 50%",       // #00E5FF
    success: "152 64% 48%",       // #2BD67B
    warning: "33 93% 60%",        // #F7A53B
    danger: "0 100% 68%",         // #FF5C5C
    
    // Background System
    background: {
      from: "245 35% 7%",         // #0B0A12
      to: "234 38% 13%",          // #12142A
      card: "230 28% 13%",        // #161A2C
      cardAlt: "229 30% 16%",     // #1B2036
    },
    
    // Stroke & Borders
    border: {
      base: "225 24% 22%",        // #2A2F42
      subtle: "225 24% 22% / 0.12",
      medium: "225 24% 22% / 0.16",
    },
    
    // Text
    text: {
      primary: "0 0% 98%",
      secondary: "240 10% 70%",
      muted: "240 10% 50%",
    }
  },
  
  typography: {
    fontFamily: {
      heading: "'Space Grotesk', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
    },
    fontWeight: {
      bold: "700",
      semibold: "600",
      medium: "500",
      regular: "400",
    }
  },
  
  spacing: {
    unit: 4, // 4pt base
    grid: 8, // 8pt grid
  },
  
  radius: {
    card: "16px",
    hero: "24px",
    pill: "999px",
  },
  
  motion: {
    duration: {
      fast: "120ms",
      base: "220ms",
      slow: "320ms",
    },
    easing: {
      smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
    }
  },
  
  shadows: {
    card: "0 8px 32px -8px hsl(245 35% 7% / 0.4)",
    glow: "0 0 24px -6px",
    dock: "0 -8px 32px -8px hsl(245 35% 7% / 0.6)",
  }
} as const;

export type NovaAdminTokens = typeof novaAdminTokens;
