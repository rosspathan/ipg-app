import { useMemo } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * Priority: session email local-part > profile.full_name > profile.email local-part > "User"
 * 
 * Enhanced: Now uses extractUsernameFromEmail for proper sanitization
 */
export function useDisplayName() {
  const { user } = useAuthUser();
  const { userApp } = useProfile();

  const displayName = useMemo(() => {
    // Priority 1: Session email (most reliable)
    if (user?.email) {
      return extractUsernameFromEmail(user.email, user.id);
    }
    
    // Priority 2: Profile full_name (if set by migration)
    if (userApp?.full_name && userApp.full_name !== 'User') {
      return userApp.full_name;
    }
    
    // Priority 3: Profile email
    if (userApp?.email) {
      return extractUsernameFromEmail(userApp.email, user?.id);
    }
    
    // Fallback with user ID if available
    if (user?.id) {
      return `user${user.id.slice(0, 6)}`;
    }
    
    return "User";
  }, [user?.email, user?.id, userApp?.email, userApp?.full_name]);

  return displayName;
}
