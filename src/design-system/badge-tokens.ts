/**
 * Badge Design System - Design Tokens
 * Comprehensive token system for badge tiers, animations, and visual effects
 */

import { novaAdminTokens } from './nova-admin-tokens';

export const badgeTokens = {
  // Badge Tier Colors (HSL format for consistency)
  tiers: {
    none: {
      primary: "240 5% 50%",        // #78787D
      secondary: "240 5% 40%",      // #616166
      accent: "240 5% 60%",         // #8F8F94
      glow: "240 5% 50% / 0.3",
      text: "240 5% 90%",
    },
    silver: {
      primary: "210 20% 75%",       // #B8C5D6
      secondary: "210 20% 65%",     // #9FAFC4
      accent: "200 40% 85%",        // #CCE5F0
      glow: "210 40% 70% / 0.4",
      text: "210 30% 20%",
    },
    gold: {
      primary: "45 90% 60%",        // #F4C542
      secondary: "42 85% 55%",      // #E8B73A
      accent: "48 95% 70%",         // #F9D975
      glow: "45 100% 60% / 0.5",
      text: "45 80% 15%",
    },
    platinum: {
      primary: "200 15% 70%",       // #A3B8C2
      secondary: "200 20% 60%",     // #8AA3B3
      accent: "180 25% 85%",        // #C8E0E8
      glow: "200 30% 70% / 0.5",
      text: "200 30% 15%",
    },
    diamond: {
      primary: "200 100% 75%",      // #80E5FF
      secondary: "195 100% 65%",    // #5CD9F5
      accent: "185 100% 85%",       // #B3F0FF
      glow: "200 100% 70% / 0.6",
      text: "200 80% 10%",
    },
    vip: {
      primary: "280 100% 65%",      // #B366FF
      secondary: "275 90% 55%",     // #9A33E8
      accent: "285 100% 75%",       // #D699FF
      glow: "280 100% 60% / 0.7",
      text: "280 80% 98%",
    },
  },

  // Badge Gradients
  gradients: {
    none: {
      card: "linear-gradient(135deg, hsl(240 5% 50%), hsl(240 5% 40%))",
      ribbon: "linear-gradient(90deg, hsl(240 5% 45%), hsl(240 5% 55%))",
      foil: "linear-gradient(135deg, hsl(240 5% 40%) 0%, hsl(240 5% 60%) 50%, hsl(240 5% 40%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(240 5% 60% / 0.2), transparent 70%)",
    },
    silver: {
      card: "linear-gradient(135deg, hsl(210 20% 75%), hsl(210 20% 65%))",
      ribbon: "linear-gradient(90deg, hsl(210 25% 70%), hsl(200 30% 80%))",
      foil: "linear-gradient(135deg, hsl(210 20% 65%) 0%, hsl(200 40% 85%) 50%, hsl(210 20% 65%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(210 40% 70% / 0.3), transparent 70%)",
      shimmer: "linear-gradient(90deg, transparent 0%, hsl(210 40% 90% / 0.6) 50%, transparent 100%)",
    },
    gold: {
      card: "linear-gradient(135deg, hsl(45 90% 60%), hsl(42 85% 50%))",
      ribbon: "linear-gradient(90deg, hsl(42 85% 55%), hsl(48 95% 70%))",
      foil: "linear-gradient(135deg, hsl(42 85% 50%) 0%, hsl(48 95% 70%) 50%, hsl(42 85% 50%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(45 100% 60% / 0.4), transparent 70%)",
      shimmer: "linear-gradient(90deg, transparent 0%, hsl(48 100% 80% / 0.7) 50%, transparent 100%)",
    },
    platinum: {
      card: "linear-gradient(135deg, hsl(200 15% 70%), hsl(200 20% 60%))",
      ribbon: "linear-gradient(90deg, hsl(200 20% 65%), hsl(180 25% 80%))",
      foil: "linear-gradient(135deg, hsl(200 20% 60%) 0%, hsl(180 25% 85%) 50%, hsl(200 20% 60%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(200 30% 70% / 0.4), transparent 70%)",
      shimmer: "linear-gradient(90deg, transparent 0%, hsl(180 30% 90% / 0.8) 50%, transparent 100%)",
    },
    diamond: {
      card: "linear-gradient(135deg, hsl(200 100% 75%), hsl(195 100% 65%))",
      ribbon: "linear-gradient(90deg, hsl(195 100% 70%), hsl(185 100% 85%))",
      foil: "linear-gradient(135deg, hsl(195 100% 65%) 0%, hsl(185 100% 85%) 50%, hsl(195 100% 65%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(200 100% 70% / 0.5), transparent 70%)",
      shimmer: "linear-gradient(90deg, transparent 0%, hsl(185 100% 90% / 0.9) 50%, transparent 100%)",
      prismatic: "linear-gradient(135deg, hsl(200 100% 70%) 0%, hsl(280 100% 70%) 25%, hsl(45 100% 70%) 50%, hsl(120 100% 70%) 75%, hsl(200 100% 70%) 100%)",
    },
    vip: {
      card: "linear-gradient(135deg, hsl(280 100% 65%), hsl(275 90% 55%))",
      ribbon: "linear-gradient(90deg, hsl(275 90% 60%), hsl(285 100% 75%))",
      foil: "linear-gradient(135deg, hsl(275 90% 55%) 0%, hsl(285 100% 75%) 50%, hsl(275 90% 55%) 100%)",
      radial: "radial-gradient(circle at 50% 0%, hsl(280 100% 60% / 0.6), transparent 70%)",
      shimmer: "linear-gradient(90deg, transparent 0%, hsl(285 100% 85% / 1) 50%, transparent 100%)",
      aurora: "linear-gradient(135deg, hsl(280 100% 60%) 0%, hsl(200 100% 60%) 25%, hsl(120 100% 60%) 50%, hsl(280 100% 60%) 75%, hsl(320 100% 60%) 100%)",
    },
  },

  // Motion System
  motion: {
    duration: {
      instant: "100ms",
      fast: "200ms",
      normal: "300ms",
      slow: "500ms",
      slower: "800ms",
    },
    easing: {
      smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      linear: "linear",
    },
    transition: {
      default: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      color: "color 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      transform: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      opacity: "opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
  },

  // Spacing System (8pt grid)
  spacing: {
    xs: "4px",    // 0.5 unit
    sm: "8px",    // 1 unit
    md: "16px",   // 2 units
    lg: "24px",   // 3 units
    xl: "32px",   // 4 units
    "2xl": "48px", // 6 units
    "3xl": "64px", // 8 units
  },

  // Typography Scale
  typography: {
    fontFamily: {
      heading: "'Space Grotesk', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: "0.75rem",      // 12px
      sm: "0.875rem",     // 14px
      base: "1rem",       // 16px
      lg: "1.125rem",     // 18px
      xl: "1.25rem",      // 20px
      "2xl": "1.5rem",    // 24px
      "3xl": "1.875rem",  // 30px
      "4xl": "2.25rem",   // 36px
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.75",
    },
  },

  // Shadow System
  shadows: {
    elevation: {
      sm: "0 2px 8px -2px hsl(0 0% 0% / 0.1)",
      md: "0 4px 16px -4px hsl(0 0% 0% / 0.15)",
      lg: "0 8px 32px -8px hsl(0 0% 0% / 0.2)",
      xl: "0 12px 48px -12px hsl(0 0% 0% / 0.25)",
    },
    glow: {
      silver: "0 0 24px -6px hsl(210 40% 70% / 0.4)",
      gold: "0 0 32px -6px hsl(45 100% 60% / 0.5)",
      platinum: "0 0 32px -6px hsl(200 30% 70% / 0.5)",
      diamond: "0 0 40px -6px hsl(200 100% 70% / 0.6)",
      vip: "0 0 48px -6px hsl(280 100% 60% / 0.7)",
    },
    inner: {
      soft: "inset 0 2px 4px hsl(0 0% 0% / 0.06)",
      medium: "inset 0 2px 8px hsl(0 0% 0% / 0.1)",
    },
  },

  // Border Radius
  radius: {
    none: "0",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    pill: "999px",
    card: "16px",
    badge: "12px",
  },

  // Animation Presets
  animations: {
    fade: {
      in: "fade-in 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      out: "fade-out 300ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    scale: {
      in: "scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      out: "scale-out 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    slide: {
      up: "slide-up 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      down: "slide-down 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      left: "slide-left 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      right: "slide-right 300ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    shimmer: {
      silver: "shimmer-silver 3s linear infinite",
      gold: "shimmer-gold 2.5s linear infinite",
      platinum: "shimmer-platinum 3s linear infinite",
      diamond: "shimmer-diamond 2s linear infinite",
      vip: "shimmer-vip 4s linear infinite",
    },
    pulse: {
      soft: "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      glow: "pulse-glow 2s ease-in-out infinite",
    },
  },

  // Particle Effects Configuration
  particles: {
    silver: {
      count: 8,
      size: "2px",
      color: "hsl(210 40% 80%)",
      duration: "3s",
      opacity: 0.4,
    },
    gold: {
      count: 12,
      size: "3px",
      color: "hsl(48 100% 70%)",
      duration: "2.5s",
      opacity: 0.6,
    },
    platinum: {
      count: 12,
      size: "3px",
      color: "hsl(180 30% 85%)",
      duration: "3s",
      opacity: 0.5,
    },
    diamond: {
      count: 16,
      size: "4px",
      color: "hsl(185 100% 85%)",
      duration: "2s",
      opacity: 0.7,
    },
    vip: {
      count: 20,
      size: "4px",
      color: "hsl(285 100% 80%)",
      duration: "4s",
      opacity: 0.8,
    },
  },

  // Integration with Nova Admin Tokens
  admin: {
    primary: novaAdminTokens.colors.primary,
    secondary: novaAdminTokens.colors.secondary,
    accent: novaAdminTokens.colors.accent,
    background: novaAdminTokens.colors.background,
    border: novaAdminTokens.colors.border,
    text: novaAdminTokens.colors.text,
    shadows: novaAdminTokens.shadows,
    motion: novaAdminTokens.motion,
  },
} as const;

// Helper function to get tier tokens
export const getTierTokens = (tier: keyof typeof badgeTokens.tiers) => {
  return badgeTokens.tiers[tier] || badgeTokens.tiers.none;
};

// Helper function to get tier gradients
export const getTierGradients = (tier: keyof typeof badgeTokens.gradients) => {
  return badgeTokens.gradients[tier] || badgeTokens.gradients.none;
};

// Helper function to get tier glow shadow
export const getTierGlowShadow = (tier: keyof typeof badgeTokens.shadows.glow) => {
  return badgeTokens.shadows.glow[tier] || "";
};

// Type exports
export type BadgeTier = keyof typeof badgeTokens.tiers;
export type BadgeTokens = typeof badgeTokens;
