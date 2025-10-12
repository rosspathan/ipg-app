import { supabase } from '@/integrations/supabase/client';

/**
 * Refresh Supabase session if token is expired
 * Returns true if session is valid/refreshed, false if failed
 */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      return false;
    }

    if (!session) {
      console.warn('No active session');
      return false;
    }

    // Check if token is expired or will expire soon (within 1 minute)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiryTime = expiresAt * 1000; // Convert to ms
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      // If expired or expiring within 1 minute, refresh
      if (timeUntilExpiry < 60000) {
        console.log('Token expiring soon, refreshing...');
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh error:', refreshError);
          return false;
        }

        if (data.session) {
          console.log('Session refreshed successfully');
          return true;
        }
      }
    }

    // Session is valid
    return true;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return false;
  }
}

/**
 * Wrapper for Supabase operations that handles session refresh
 * Retries once if initial attempt fails due to auth
 */
export async function withSessionRefresh<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    // Try operation first
    return await operation();
  } catch (error: any) {
    // Check if it's an auth error
    const isAuthError = 
      error?.message?.includes('JWT') ||
      error?.message?.includes('expired') ||
      error?.message?.includes('invalid') ||
      error?.code === 'PGRST301';

    if (isAuthError) {
      console.log('Auth error detected, attempting session refresh...');
      const refreshed = await refreshSessionIfNeeded();
      
      if (refreshed) {
        // Retry operation once
        console.log('Retrying operation after session refresh...');
        return await operation();
      }
    }
    
    // Re-throw if not auth error or refresh failed
    throw error;
  }
}
