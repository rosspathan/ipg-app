import { useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ensureReferralCaptured } from '@/utils/referralCapture';

/**
 * Safety net component that ensures referral capture completes
 * Runs on app home page load
 */
export function ReferralCaptureGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthUser();

  useEffect(() => {
    if (user?.id) {
      // Non-blocking safety net check
      ensureReferralCaptured(user.id).catch(err => {
        console.error('[ReferralCaptureGuard] Failed:', err);
      });
    }
  }, [user?.id]);

  return <>{children}</>;
}
