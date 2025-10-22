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
