import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getLocalSecurityData } from '@/utils/localSecurityStorage';

/**
 * Session Ownership Validator
 * 
 * Validates that the current Supabase session matches the user who owns
 * the local security data (PIN, biometrics, etc).
 * 
 * This prevents session/account mismatches when:
 * - Multiple users log in from the same browser
 * - Browser is refreshed while different account data exists in localStorage
 * - Session expires and a different user logs in
 */

export interface SessionValidationResult {
  valid: boolean;
  conflict: boolean;
  details?: {
    sessionUserId: string;
    localSecurityUserId?: string;
    message: string;
  };
}

/**
 * Validate that session matches local security data owner
 */
export async function validateSessionOwnership(
  session: Session | null
): Promise<SessionValidationResult> {
  if (!session) {
    console.log('[SessionValidator] No session - validation passed');
    return { valid: true, conflict: false };
  }

  const sessionUserId = session.user.id;
  
  // Check local security data
  const localSecurity = getLocalSecurityData();
  
  if (!localSecurity) {
    console.log('[SessionValidator] No local security data - validation passed');
    return { valid: true, conflict: false };
  }

  // Check if local security has user_id tracking
  if (!localSecurity.user_id) {
    console.log('[SessionValidator] Legacy security data (no user_id) - allowing');
    return { valid: true, conflict: false };
  }

  // Compare session user with local security owner
  if (localSecurity.user_id !== sessionUserId) {
    console.warn('[SessionValidator] ⚠️ OWNERSHIP CONFLICT DETECTED:', {
      sessionUserId,
      localSecurityUserId: localSecurity.user_id,
      sessionEmail: session.user.email
    });

    return {
      valid: false,
      conflict: true,
      details: {
        sessionUserId,
        localSecurityUserId: localSecurity.user_id,
        message: 'Session user does not match local security data owner'
      }
    };
  }

  console.log('[SessionValidator] ✓ Session ownership validated:', sessionUserId);
  return { valid: true, conflict: false };
}

/**
 * Detect session mismatch across all storage layers
 */
export async function detectSessionMismatch(): Promise<{
  conflict: boolean;
  details?: {
    sessionUserId?: string;
    localSecurityUserId?: string;
    lockStateUserId?: string;
  };
}> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { conflict: false };
    }

    const sessionUserId = session.user.id;
    const localSecurity = getLocalSecurityData();
    
    // Check if local security belongs to different user
    if (localSecurity?.user_id && localSecurity.user_id !== sessionUserId) {
      console.warn('[SessionValidator] Multi-layer conflict detected');
      return {
        conflict: true,
        details: {
          sessionUserId,
          localSecurityUserId: localSecurity.user_id
        }
      };
    }

    return { conflict: false };
  } catch (error) {
    console.error('[SessionValidator] Error during mismatch detection:', error);
    return { conflict: false };
  }
}

/**
 * Resolve session conflict by clearing mismatched data
 */
export async function resolveSessionConflict(sessionUserId: string): Promise<void> {
  const localSecurity = getLocalSecurityData();
  
  if (localSecurity?.user_id && localSecurity.user_id !== sessionUserId) {
    console.log('[SessionValidator] Clearing mismatched security data');
    
    // Import dynamically to avoid circular dependencies
    const { clearLocalSecurity } = await import('@/utils/localSecurityStorage');
    const { clearLockData } = await import('@/utils/lockState');
    
    clearLocalSecurity();
    clearLockData();
    
    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('auth:security_data_cleared', {
      detail: {
        previousUserId: localSecurity.user_id,
        currentUserId: sessionUserId
      }
    }));
    
    console.log('[SessionValidator] ✅ Conflict resolved - security data cleared');
  }
}

/**
 * Auto-resolve conflicts if safe to do so
 * Only clears local data, does NOT sign out the user
 */
export async function autoResolveIfSafe(session: Session | null): Promise<boolean> {
  if (!session) return false;

  const validation = await validateSessionOwnership(session);
  
  if (validation.conflict && validation.details) {
    console.log('[SessionValidator] Auto-resolving by clearing old local data only');
    
    // Import dynamically to avoid circular dependencies
    const { clearLocalSecurity } = await import('@/utils/localSecurityStorage');
    const { clearLockData } = await import('@/utils/lockState');
    
    clearLocalSecurity();
    clearLockData();
    
    // DON'T call supabase.auth.signOut() - keep the session alive
    
    // Emit event for UI handling
    window.dispatchEvent(new CustomEvent('auth:security_data_cleared', {
      detail: {
        previousUserId: validation.details.localSecurityUserId,
        currentUserId: session.user.id
      }
    }));
    
    console.log('[SessionValidator] ✅ Conflict resolved - session preserved');
    return true;
  }

  return false;
}
