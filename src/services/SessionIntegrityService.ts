import { supabase } from '@/integrations/supabase/client';
import { clearAllUserData } from '@/utils/clearLegacyStorage';

/**
 * Session Integrity Service
 * 
 * Prevents cross-account contamination by validating that the current
 * Supabase session matches the last known user ID stored locally.
 * 
 * If a mismatch is detected, signs out and clears all user data.
 */

const LAST_KNOWN_USER_KEY = 'session_integrity_user_id';

export class SessionIntegrityService {
  /**
   * Store the current user ID as the "last known" user
   */
  static setLastKnownUser(userId: string) {
    console.log('[SESSION_INTEGRITY] Setting last known user:', userId);
    localStorage.setItem(LAST_KNOWN_USER_KEY, userId);
  }

  /**
   * Clear the last known user (on sign out)
   */
  static clearLastKnownUser() {
    console.log('[SESSION_INTEGRITY] Clearing last known user');
    localStorage.removeItem(LAST_KNOWN_USER_KEY);
  }

  /**
   * Verify that the current session matches the last known user
   * If mismatch detected, sign out and clear all data
   * 
   * @returns true if session is valid, false if session was cleared
   */
  static async verifySessionIntegrity(): Promise<boolean> {
    try {
      // Skip check if login is in progress
      if (sessionStorage.getItem('login_in_progress')) {
        console.log('[SESSION_INTEGRITY] Skipping check - login in progress');
        return true;
      }

      // Add cooldown to prevent rapid checks causing race conditions
      const lastCheck = sessionStorage.getItem('session_integrity_last_check');
      const now = Date.now();
      if (lastCheck && (now - parseInt(lastCheck)) < 2000) {
        console.log('[SESSION_INTEGRITY] Skipping - checked recently');
        return true;
      }
      sessionStorage.setItem('session_integrity_last_check', now.toString());

      const { data: { session } } = await supabase.auth.getSession();
      const lastKnownUserId = localStorage.getItem(LAST_KNOWN_USER_KEY);

      // No session and no last known user = clean slate
      if (!session && !lastKnownUserId) {
        console.log('[SESSION_INTEGRITY] ✓ No session, no last known user - clean state');
        return true;
      }

      // Session exists but no last known user = new session, store it
      if (session && !lastKnownUserId) {
        console.log('[SESSION_INTEGRITY] ✓ New session detected, storing user ID');
        this.setLastKnownUser(session.user.id);
        return true;
      }

      // Last known user but no session = user signed out elsewhere
      if (!session && lastKnownUserId) {
        console.log('[SESSION_INTEGRITY] ℹ️ User signed out, clearing last known user');
        this.clearLastKnownUser();
        clearAllUserData();
        return true;
      }

      // Both exist - verify they match
      if (session && lastKnownUserId) {
        if (session.user.id === lastKnownUserId) {
          console.log('[SESSION_INTEGRITY] ✓ Session matches last known user');
          return true;
        } else {
          console.error('[SESSION_INTEGRITY] ⚠️ SESSION MISMATCH DETECTED', {
            currentSession: session.user.id,
            lastKnownUser: lastKnownUserId,
            sessionEmail: session.user.email
          });

          // Critical: Session belongs to a different user
          // Sign out and clear everything
          await supabase.auth.signOut();
          this.clearLastKnownUser();
          clearAllUserData();

          // Dispatch event for UI to handle
          window.dispatchEvent(new CustomEvent('auth:session_integrity_violation', {
            detail: {
              message: 'Session belonged to a different account. Signed out for security.',
              previousUserId: lastKnownUserId,
              attemptedUserId: session.user.id
            }
          }));

          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[SESSION_INTEGRITY] Error during verification:', error);
      return true; // Don't block on errors
    }
  }

  /**
   * Initialize session integrity guard
   * Call this on app startup or route guard
   */
  static async initialize(): Promise<boolean> {
    console.log('[SESSION_INTEGRITY] Initializing session integrity guard');
    return await this.verifySessionIntegrity();
  }
}
