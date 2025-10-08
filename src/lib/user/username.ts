/**
 * Username utilities for extracting and sanitizing usernames from emails
 * Part of the Username+Wallet patch
 */

/**
 * Extract a clean username from an email address
 * @param email - User's email address
 * @param userId - Optional user ID for fallback generation
 * @returns Sanitized username (max 20 chars)
 */
export function extractUsernameFromEmail(email: string | null | undefined, userId?: string): string {
  if (!email) {
    if (userId) {
      return `user${userId.slice(0, 6)}`;
    }
    return `user${Math.random().toString(36).slice(2, 6)}`;
  }

  // Extract local part (before @)
  const localPart = email.split('@')[0] || '';
  
  // Convert to lowercase and sanitize
  let username = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
  
  // If empty after sanitization, use fallback
  if (!username) {
    if (userId) {
      return `user${userId.slice(0, 6)}`;
    }
    return `user${Math.random().toString(36).slice(2, 6)}`;
  }
  
  return username;
}

/**
 * Format display name for UI (capitalize first letter)
 */
export function formatDisplayName(username: string): string {
  if (!username) return "User";
  return username.charAt(0).toUpperCase() + username.slice(1);
}

