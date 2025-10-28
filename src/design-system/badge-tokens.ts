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
      primary: "210 30% 85%",       // Bright polished silver
      secondary: "210 25% 75%",     // Medium silver
      accent: "210 40% 92%",        // Highlight shine
      glow: "210 60% 80% / 0.6",    // Strong metallic glow
      text: "210 30% 20%",
      metallic: "linear-gradient(135deg, #B8C5D6 0%, #E8EEF5 50%, #B8C5D6 100%)",
    },
    gold: {
      primary: "43 100% 55%",       // Rich 24K gold
      secondary: "38 100% 50%",     // Deep gold
      accent: "48 100% 70%",        // Bright golden highlight
      glow: "43 100% 60% / 0.7",    // Warm golden glow
      text: "45 80% 15%",
      metallic: "linear-gradient(135deg, #DAA520 0%, #FFD700 25%, #FFF4A3 50%, #FFD700 75%, #DAA520 100%)",
    },
    platinum: {
      primary: "200 15% 90%",       // Bright platinum white
      secondary: "200 20% 80%",     // Medium platinum
      accent: "180 30% 95%",        // Pure white shine
      glow: "200 40% 85% / 0.7",    // Bright platinum glow
      text: "200 30% 15%",
      metallic: "linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 25%, #FFFFFF 50%, #E8E8E8 75%, #C0C0C0 100%)",
    },
    diamond: {
      primary: "200 100% 70%",      // Bright cyan brilliance
      secondary: "195 100% 60%",    // Deep cyan
      accent: "185 100% 90%",       // Crystal highlight
      glow: "200 100% 75% / 0.8",   // Intense sparkle
      text: "200 80% 10%",
      prismatic: "linear-gradient(135deg, #66D9FF 0%, #A366FF 25%, #FFD966 50%, #66FFB3 75%, #66D9FF 100%)",
      sparkle: true,
    },
    vip: {
      primary: "280 100% 70%",      // Brighter royal purple
      secondary: "275 90% 60%",     // Deep purple
      accent: "285 100% 80%",       // Light purple accent
      glow: "280 100% 65% / 0.9",   // Intense royal glow
      text: "280 80% 98%",
      aurora: "linear-gradient(135deg, #CC66FF 0%, #66D9FF 25%, #66FFB3 50%, #CC66FF 75%, #FF66B3 100%)",
      animated: true,
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

// Helper function to convert badge name to tier key
export const getTierKey = (badge: string): keyof typeof badgeTokens.tiers => {
  const key = badge.toLowerCase() as keyof typeof badgeTokens.tiers;
  return badgeTokens.tiers[key] ? key : 'none';
};

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
