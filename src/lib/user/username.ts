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
    return "user";
  }

  // Extract local part (before @)
  const localPart = email.split('@')[0] || '';
  
  // Convert to lowercase
  let username = localPart.toLowerCase();
  
  // Keep only letters, numbers, underscore, and dot
  username = username.replace(/[^a-z0-9_.]/g, '');
  
  // Trim to 20 characters
  username = username.slice(0, 20);
  
  // If empty after sanitization, use fallback
  if (!username) {
    if (userId) {
      return `user${userId.slice(0, 6)}`;
    }
    return "user";
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

