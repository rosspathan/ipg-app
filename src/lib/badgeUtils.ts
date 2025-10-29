import { BadgeTier } from "@/components/badge-id/BadgeIdThemeRegistry";

/**
 * Normalizes badge names from various database formats to consistent UI format
 * Handles: "i-Smart VIP", "I-SMART VIP", "VIP" -> "VIP"
 */
export function normalizeBadgeName(badge: string | null | undefined): BadgeTier | 'None' {
  if (!badge) return 'None';
  
  const badgeUpper = badge.toUpperCase().trim();
  
  // Handle VIP variations
  if (badgeUpper.includes('VIP')) {
    return 'VIP';
  }
  
  // Handle standard tiers (case-insensitive)
  const validTiers: Record<string, BadgeTier> = {
    'SILVER': 'Silver',
    'GOLD': 'Gold',
    'PLATINUM': 'Platinum',
    'DIAMOND': 'Diamond',
  };
  
  if (validTiers[badgeUpper]) {
    return validTiers[badgeUpper];
  }
  
  // If it's already a valid tier, return as-is
  const tier = badge as BadgeTier;
  const allTiers: BadgeTier[] = ['Silver', 'Gold', 'Platinum', 'Diamond', 'VIP'];
  if (allTiers.includes(tier)) {
    return tier;
  }
  
  return 'None';
}

/**
 * Gets display name for badges (UI-friendly branded format)
 * Internal: "VIP" → Display: "i-Smart VIP"
 */
export function getBadgeDisplayName(badge: BadgeTier | 'None'): string {
  const displayNames: Record<BadgeTier | 'None', string> = {
    'Silver': 'Silver',
    'Gold': 'Gold',
    'Platinum': 'Platinum',
    'Diamond': 'Diamond',
    'VIP': 'i-Smart VIP', // ✨ Branded display name
    'None': 'No Badge' // ✅ Clear indication - user must purchase
  };
  return displayNames[badge] || 'No Badge';
}

/**
 * Validates if a badge name is recognized by the system
 */
export function isValidBadgeName(badge: string): boolean {
  const normalized = normalizeBadgeName(badge);
  return normalized !== 'None';
}

/**
 * Ensures badge name is in correct normalized format for database operations
 * Throws error if badge is invalid
 */
export function sanitizeBadgeForDB(badge: string): BadgeTier {
  const normalized = normalizeBadgeName(badge);
  if (normalized === 'None') {
    throw new Error(`Invalid badge name: ${badge}`);
  }
  return normalized;
}
