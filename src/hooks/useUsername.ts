import { useAuthUser } from "./useAuthUser";
import { useProfile } from "./useProfile";

/**
 * useUsername - Single Source of Truth for Display Names
 * 
 * Always returns the correct username for display across the entire app.
 * 
 * Priority:
 * 1. profile.display_name (user-customizable)
 * 2. profile.username (auto-generated from email)
 * 3. "user{id}" fallback for authenticated users
 * 4. "User" default
 * 
 * Usage:
 * ```tsx
 * const username = useUsername();
 * return <div>Welcome, {username}!</div>;
 * ```
 */
export function useUsername(): string {
  const { user } = useAuthUser();
  const { userApp } = useProfile();

  // Priority 1: User-customizable display name
  if (userApp?.display_name) {
    return userApp.display_name;
  }

  // Priority 2: Auto-generated username from email
  if (userApp?.username) {
    return userApp.username;
  }

  // Priority 3: Fallback to user ID (authenticated but no profile yet)
  if (user?.id) {
    return `user${user.id.slice(0, 6)}`;
  }

  // Priority 4: Default
  return "User";
}
