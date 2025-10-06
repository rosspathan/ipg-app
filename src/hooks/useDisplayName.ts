import { useMemo } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";

/**
 * useDisplayName
 * Consistently derive a user-facing display name across the app.
 * Priority: session email local-part > profile.email local-part > profile.full_name > "User"
 */
export function useDisplayName() {
  const { user } = useAuthUser();
  const { userApp } = useProfile();

  const displayName = useMemo(() => {
    const fromSession = user?.email?.split("@")[0]?.trim();
    const fromProfileEmail = userApp?.email?.split("@")[0]?.trim();
    const fromProfileFull = userApp?.full_name?.trim();
    return fromSession || fromProfileEmail || fromProfileFull || "User";
  }, [user?.email, userApp?.email, userApp?.full_name]);

  return displayName;
}
