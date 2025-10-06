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
    name: 'Silver Rank',
    colors: {
      primary: '#C7CCD6',
      secondary: '#ECEFF4',
      accent: '#8AA0B8',
      glow: '#FFFFFF',
      text: '#1a1f33',
      textSecondary: '#5a6278',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, #C7CCD6 0%, #ECEFF4 100%)',
      card: 'linear-gradient(180deg, #e8ebf0 0%, #f5f7fa 50%, #e8ebf0 100%)',
      foil: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)',
    },
    effects: {
      holoIntensity: 0.15,
      glowStrength: 0.3,
      pattern: 'guilloché',
    },
    badge: {
      glyph: '★',
      position: 'top-right',
    },
  },
  Gold: {
    name: 'Gold Rank',
    colors: {
      primary: '#E5C158',
      secondary: '#F7DA7A',
      accent: '#B57E2E',
      glow: '#FFF2CF',
      text: '#2a1f0d',
      textSecondary: '#6b5a3d',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, #E5C158 0%, #F7DA7A 100%)',
      card: 'linear-gradient(180deg, #f5e8c8 0%, #fffbeb 50%, #f5e8c8 100%)',
      foil: 'linear-gradient(110deg, transparent 30%, rgba(255,242,207,0.9) 50%, transparent 70%)',
    },
    effects: {
      holoIntensity: 0.25,
      glowStrength: 0.5,
      pattern: 'confetti',
    },
    badge: {
      glyph: '★',
      position: 'top-right',
    },
  },
  Platinum: {
    name: 'Platinum Rank',
    colors: {
      primary: '#8C9BAF',
      secondary: '#CFE1F7',
      accent: '#6D8FB0',
      glow: '#EBF4FF',
      text: '#1a2433',
      textSecondary: '#4a5768',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, #8C9BAF 0%, #CFE1F7 100%)',
      card: 'linear-gradient(180deg, #dce6f2 0%, #f0f7ff 50%, #dce6f2 100%)',
      foil: 'linear-gradient(110deg, transparent 30%, rgba(235,244,255,0.9) 50%, transparent 70%)',
    },
    effects: {
      holoIntensity: 0.3,
      glowStrength: 0.6,
      pattern: 'brush',
    },
    badge: {
      glyph: '◆',
      position: 'top-right',
    },
  },
  Diamond: {
    name: 'Diamond Rank',
    colors: {
      primary: '#57E2FF',
      secondary: '#B6F3FF',
      accent: '#2CCBFF',
      glow: '#B6F3FF',
      text: '#0d1f26',
      textSecondary: '#2d4a54',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, #57E2FF 0%, #B6F3FF 100%)',
      card: 'linear-gradient(180deg, #d4f4ff 0%, #f0fcff 50%, #d4f4ff 100%)',
      foil: 'linear-gradient(110deg, rgba(87,226,255,0.3) 30%, rgba(182,243,255,0.8) 50%, rgba(87,226,255,0.3) 70%)',
    },
    effects: {
      holoIntensity: 0.4,
      glowStrength: 0.8,
      pattern: 'lattice',
    },
    badge: {
      glyph: '◆',
      position: 'top-right',
    },
  },
  VIP: {
    name: 'i-SMART VIP',
    colors: {
      primary: '#8B5CFF',
      secondary: '#00E5FF',
      accent: '#00C6FF',
      glow: '#B68CFF',
      text: '#1a1433',
      textSecondary: '#4a3d68',
    },
    gradients: {
      ribbon: 'linear-gradient(135deg, #8B5CFF 0%, #00E5FF 100%)',
      card: 'linear-gradient(180deg, #e8dcff 0%, #f0fbff 50%, #e8dcff 100%)',
      foil: 'linear-gradient(110deg, rgba(139,92,255,0.4) 30%, rgba(0,229,255,0.6) 50%, rgba(139,92,255,0.4) 70%)',
    },
    effects: {
      holoIntensity: 0.5,
      glowStrength: 1.0,
      pattern: 'aurora',
    },
    badge: {
      glyph: '★ VIP',
      position: 'top-right',
    },
  },
};

export function getThemeForTier(tier: BadgeTier): BadgeTheme {
  return BADGE_THEMES[tier];
}

export function getAllTiers(): BadgeTier[] {
  return ['Silver', 'Gold', 'Platinum', 'Diamond', 'VIP'];
}
