export type BadgeTier = 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'VIP';

export interface BadgeTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    text: string;
    textSecondary: string;
  };
  gradients: {
    ribbon: string;
    card: string;
    foil: string;
  };
  effects: {
    holoIntensity: number;
    glowStrength: number;
    pattern: 'guilloché' | 'confetti' | 'brush' | 'lattice' | 'aurora';
  };
  badge: {
    glyph: string;
    position: 'top-right' | 'bottom-right';
  };
}

export const BADGE_THEMES: Record<BadgeTier, BadgeTheme> = {
  Silver: {
    name: 'Silver',
    colors: {
      primary: 'hsl(210, 15%, 78%)',
      secondary: 'hsl(210, 15%, 92%)',
      accent: 'hsl(210, 20%, 85%)',
      glow: 'hsl(210, 30%, 70%)',
      text: 'hsl(210, 20%, 20%)',
      textSecondary: 'hsl(210, 10%, 45%)',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, hsl(210, 15%, 78%) 0%, hsl(210, 15%, 92%) 100%)',
      card: 'linear-gradient(180deg, hsl(210, 20%, 15%) 0%, hsl(210, 25%, 10%) 100%)',
      foil: 'linear-gradient(45deg, transparent 40%, hsl(210, 30%, 85%) 50%, transparent 60%)',
    },
    effects: {
      holoIntensity: 0.3,
      glowStrength: 0.4,
      pattern: 'guilloché',
    },
    badge: {
      glyph: '★',
      position: 'top-right',
    },
  },
  Gold: {
    name: 'Gold',
    colors: {
      primary: 'hsl(43, 74%, 59%)',
      secondary: 'hsl(45, 82%, 72%)',
      accent: 'hsl(42, 76%, 65%)',
      glow: 'hsl(43, 80%, 55%)',
      text: 'hsl(40, 20%, 15%)',
      textSecondary: 'hsl(40, 15%, 35%)',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, hsl(43, 74%, 59%) 0%, hsl(45, 82%, 72%) 100%)',
      card: 'linear-gradient(180deg, hsl(40, 25%, 12%) 0%, hsl(38, 30%, 8%) 100%)',
      foil: 'linear-gradient(45deg, transparent 40%, hsl(45, 85%, 75%) 50%, transparent 60%)',
    },
    effects: {
      holoIntensity: 0.5,
      glowStrength: 0.6,
      pattern: 'confetti',
    },
    badge: {
      glyph: '★',
      position: 'top-right',
    },
  },
  Platinum: {
    name: 'Platinum',
    colors: {
      primary: 'hsl(210, 20%, 60%)',
      secondary: 'hsl(200, 30%, 78%)',
      accent: 'hsl(190, 40%, 70%)',
      glow: 'hsl(180, 60%, 65%)',
      text: 'hsl(210, 15%, 20%)',
      textSecondary: 'hsl(210, 12%, 40%)',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, hsl(210, 20%, 60%) 0%, hsl(200, 30%, 78%) 100%)',
      card: 'linear-gradient(180deg, hsl(210, 25%, 14%) 0%, hsl(210, 30%, 10%) 100%)',
      foil: 'linear-gradient(45deg, transparent 40%, hsl(200, 40%, 75%) 50%, transparent 60%)',
    },
    effects: {
      holoIntensity: 0.6,
      glowStrength: 0.7,
      pattern: 'brush',
    },
    badge: {
      glyph: '◆',
      position: 'top-right',
    },
  },
  Diamond: {
    name: 'Diamond',
    colors: {
      primary: 'hsl(190, 100%, 68%)',
      secondary: 'hsl(185, 100%, 78%)',
      accent: 'hsl(180, 100%, 70%)',
      glow: 'hsl(190, 100%, 65%)',
      text: 'hsl(190, 20%, 15%)',
      textSecondary: 'hsl(190, 15%, 35%)',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, hsl(190, 100%, 68%) 0%, hsl(185, 100%, 78%) 100%)',
      card: 'linear-gradient(180deg, hsl(195, 30%, 12%) 0%, hsl(190, 35%, 8%) 100%)',
      foil: 'linear-gradient(45deg, transparent 40%, hsl(185, 100%, 80%) 50%, transparent 60%)',
    },
    effects: {
      holoIntensity: 0.8,
      glowStrength: 0.9,
      pattern: 'lattice',
    },
    badge: {
      glyph: '◆',
      position: 'bottom-right',
    },
  },
  VIP: {
    name: 'i-SMART VIP',
    colors: {
      primary: 'hsl(260, 100%, 68%)',
      secondary: 'hsl(180, 100%, 50%)',
      accent: 'hsl(280, 100%, 70%)',
      glow: 'hsl(270, 100%, 65%)',
      text: 'hsl(0, 0%, 100%)',
      textSecondary: 'hsl(0, 0%, 75%)',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, hsl(260, 100%, 68%) 0%, hsl(180, 100%, 50%) 100%)',
      card: 'linear-gradient(180deg, hsl(260, 40%, 10%) 0%, hsl(190, 50%, 8%) 100%)',
      foil: 'linear-gradient(45deg, hsl(260, 100%, 70%) 40%, hsl(180, 100%, 60%) 50%, hsl(260, 100%, 70%) 60%)',
    },
    effects: {
      holoIntensity: 1.0,
      glowStrength: 1.0,
      pattern: 'aurora',
    },
    badge: {
      glyph: '★ VIP',
      position: 'bottom-right',
    },
  },
};

export function getThemeForTier(tier: BadgeTier): BadgeTheme {
  return BADGE_THEMES[tier];
}

export function getAllTiers(): BadgeTier[] {
  return ['Silver', 'Gold', 'Platinum', 'Diamond', 'VIP'];
}
