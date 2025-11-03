import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SessionConflictModal } from '@/components/SessionConflictModal';

/**
 * Session Integrity Monitor Hook
 * 
 * Listens for session integrity violations and wallet conflicts,
 * displaying appropriate UI and notifications to the user.
 */
export function useSessionIntegrityMonitor() {
  const navigate = useNavigate();
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    sessionEmail: string;
    walletAddress: string;
  } | null>(null);

  useEffect(() => {
    // Listen for session integrity violations
    const handleIntegrityViolation = (event: CustomEvent) => {
      console.error('[SESSION_MONITOR] Integrity violation detected:', event.detail);
      
      toast.error('Session Security Alert', {
        description: event.detail.message || 'Your session was invalid and has been cleared for security.',
        duration: 5000
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 2000);
    };

    // Listen for user switch events (for observability)
    const handleUserSwitch = (event: CustomEvent) => {
      console.warn('[SESSION_MONITOR] User switch detected:', event.detail);
      
      toast.info('Account Switched', {
        description: 'You have been switched to a different account.',
        duration: 3000
      });
    };

    // Listen for wallet/session conflicts
    const handleSessionConflict = (event: CustomEvent) => {
      console.warn('[SESSION_MONITOR] Session conflict detected:', event.detail);
      
      const { sessionEmail, walletAddress } = event.detail;
      
      if (sessionEmail && walletAddress) {
        setConflictDetails({ sessionEmail, walletAddress });
        setConflictModalOpen(true);
      } else {
        // Fallback: just show a toast
        toast.error('Account Mismatch', {
          description: 'The wallet you connected belongs to a different account.',
          duration: 5000
        });
      }
    };

    // Add event listeners
    window.addEventListener('auth:session_integrity_violation', handleIntegrityViolation as EventListener);
    window.addEventListener('auth:user_switched', handleUserSwitch as EventListener);
    window.addEventListener('auth:session_conflict', handleSessionConflict as EventListener);

    return () => {
      window.removeEventListener('auth:session_integrity_violation', handleIntegrityViolation as EventListener);
      window.removeEventListener('auth:user_switched', handleUserSwitch as EventListener);
      window.removeEventListener('auth:session_conflict', handleSessionConflict as EventListener);
    };
  }, [navigate]);

  return {
    ConflictModal: conflictDetails ? (
      <SessionConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        sessionEmail={conflictDetails.sessionEmail}
        walletAddress={conflictDetails.walletAddress}
      />
    ) : null
  };
}
