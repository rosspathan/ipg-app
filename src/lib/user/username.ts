/**
 * Username utilities for extracting and sanitizing usernames from emails
 */

export function extractUsernameFromEmail(email: string | null | undefined, userId?: string): string {
  if (!email) {
    if (userId) {
      return `user${userId.slice(0, 6)}`;
    }
    return `user${Math.random().toString(36).slice(2, 6)}`;
  }

  const localPart = email.split('@')[0] || '';
  let username = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
  
  if (!username) {
    if (userId) {
      return `user${userId.slice(0, 6)}`;
    }
    return `user${Math.random().toString(36).slice(2, 6)}`;
  }
  
  return username;
}

export function formatDisplayName(username: string): string {
  if (!username) return "User";
  return username.charAt(0).toUpperCase() + username.slice(1);
}
