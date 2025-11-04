/**
 * SessionManager - Centralized session management service
 * 
 * Replaces all redundant session checks across:
 * - AppInitializer
 * - UnlockGate
 * - AppLockGuard
 * - useSessionIntegrityMonitor
 * 
 * Single source of truth for authentication state and lock status
 */

import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
import { setCurrentUserId } from '@/utils/lockState';
import { setSecurityUserId } from '@/utils/localSecurityStorage';

export interface SessionState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  hasWallet: boolean;
  hasSecurity: boolean;
  isUnlocked: boolean;
  isInitialized: boolean;
  lockReason?: 'no_wallet' | 'no_security' | 'locked' | 'session_expired';
}

export interface SessionValidation {
  isValid: boolean;
  redirectTo?: string;
  reason?: string;
}

class SessionManagerClass {
  private state: SessionState = {
    session: null,
    user: null,
    isAuthenticated: false,
    hasWallet: false,
    hasSecurity: false,
    isUnlocked: false,
    isInitialized: false,
  };

  private listeners: Set<(state: SessionState) => void> = new Set();
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize session state (call once on app start)
   */
  async initialize(): Promise<SessionState> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      await this.initPromise;
      return this.state;
    }

    this.initPromise = this._performInitialization();
    await this.initPromise;
    this.initPromise = null;

    return this.state;
  }

  private async _performInitialization(): Promise<void> {
    try {
      console.log('[SessionManager] Initializing...');
      
      // Get current session (single call, no redundancy)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[SessionManager] Session error:', error);
        this.updateState({
          session: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        return;
      }

      if (!session) {
        console.log('[SessionManager] No active session');
        setCurrentUserId(null);
        setSecurityUserId(null);
        this.updateState({
          session: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        return;
      }

      // Session exists - set user context
      const userId = session.user.id;
      setCurrentUserId(userId);
      setSecurityUserId(userId);

      // Parallel checks for efficiency
      const [walletResult, hasSecurity, lockState] = await Promise.all([
        supabase.from('user_wallets').select('wallet_address').eq('user_id', userId).maybeSingle(),
        Promise.resolve(hasLocalSecurity()),
        this.checkLockState(userId)
      ]);

      const hasWallet = !!walletResult.data;

      this.updateState({
        session,
        user: session.user,
        isAuthenticated: true,
        hasWallet,
        hasSecurity,
        isUnlocked: lockState.isUnlocked,
        isInitialized: true,
        lockReason: this.determineLockReason(hasWallet, hasSecurity, lockState.isUnlocked),
      });

      console.log('[SessionManager] Initialized:', this.state);
    } catch (error) {
      console.error('[SessionManager] Initialization error:', error);
      this.updateState({
        session: null,
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  }

  /**
   * Check if user is locked and why
   */
  private async checkLockState(userId: string): Promise<{ isUnlocked: boolean }> {
    try {
      // Check for fresh setup flag
      const freshSetup = localStorage.getItem('ipg_fresh_setup') === 'true';
      if (freshSetup) {
        localStorage.removeItem('ipg_fresh_setup');
        return { isUnlocked: true };
      }

      // Check lock state
      const lockStateStr = localStorage.getItem(`cryptoflow_lock_state_${userId}`) || 
                          localStorage.getItem('cryptoflow_lock_state');
      
      if (!lockStateStr) {
        return { isUnlocked: false }; // No lock state = needs unlock
      }

      try {
        const parsed = JSON.parse(lockStateStr);
        const timeout = (parsed.sessionLockMinutes || 30) * 60 * 1000;
        const isUnlocked = parsed.isUnlocked && (Date.now() - (parsed.lastUnlockAt || 0)) < timeout;
        
        return { isUnlocked };
      } catch {
        return { isUnlocked: false };
      }
    } catch (error) {
      console.error('[SessionManager] Lock state check error:', error);
      return { isUnlocked: false };
    }
  }

  private determineLockReason(
    hasWallet: boolean, 
    hasSecurity: boolean, 
    isUnlocked: boolean
  ): SessionState['lockReason'] | undefined {
    if (!hasWallet) return 'no_wallet';
    if (!hasSecurity) return 'no_security';
    if (!isUnlocked) return 'locked';
    return undefined;
  }

  /**
   * Validate if user can access a protected route
   */
  validateAccess(pathname: string): SessionValidation {
    if (!this.state.isInitialized) {
      return { isValid: false, reason: 'Not initialized' };
    }

    // Public routes - always allow
    const publicRoutes = [
      '/',
      '/auth/login',
      '/auth/signup',
      '/auth/lock',
      '/onboarding',
      '/admin/login'
    ];
    
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return { isValid: true };
    }

    // Protected routes require authentication
    if (!this.state.isAuthenticated) {
      return { 
        isValid: false, 
        redirectTo: '/', 
        reason: 'Not authenticated' 
      };
    }

    // Check wallet
    if (!this.state.hasWallet && !pathname.startsWith('/onboarding/wallet')) {
      return { 
        isValid: false, 
        redirectTo: '/onboarding/wallet', 
        reason: 'No wallet' 
      };
    }

    // Check security setup
    if (!this.state.hasSecurity && !pathname.startsWith('/onboarding/security')) {
      return { 
        isValid: false, 
        redirectTo: '/onboarding/security', 
        reason: 'No security setup' 
      };
    }

    // Check unlock status for /app/* routes
    if (pathname.startsWith('/app') && !this.state.isUnlocked && pathname !== '/auth/lock') {
      return { 
        isValid: false, 
        redirectTo: '/auth/lock', 
        reason: 'Session locked' 
      };
    }

    return { isValid: true };
  }

  /**
   * Unlock the session (call after successful PIN/biometric verification)
   */
  async unlock(): Promise<void> {
    if (!this.state.user) {
      throw new Error('No active user');
    }

    const userId = this.state.user.id;
    const lockState = {
      isUnlocked: true,
      lastUnlockAt: Date.now(),
      sessionLockMinutes: 30,
    };

    localStorage.setItem(`cryptoflow_lock_state_${userId}`, JSON.stringify(lockState));
    
    this.updateState({
      isUnlocked: true,
      lockReason: undefined,
    });

    console.log('[SessionManager] Session unlocked');
  }

  /**
   * Lock the session
   */
  lock(): void {
    if (!this.state.user) return;

    const userId = this.state.user.id;
    const lockState = {
      isUnlocked: false,
      lastUnlockAt: 0,
      sessionLockMinutes: 30,
    };

    localStorage.setItem(`cryptoflow_lock_state_${userId}`, JSON.stringify(lockState));
    
    this.updateState({
      isUnlocked: false,
      lockReason: 'locked',
    });

    console.log('[SessionManager] Session locked');
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    
    setCurrentUserId(null);
    setSecurityUserId(null);
    
    this.updateState({
      session: null,
      user: null,
      isAuthenticated: false,
      hasWallet: false,
      hasSecurity: false,
      isUnlocked: false,
      lockReason: undefined,
    });

    console.log('[SessionManager] Signed out');
  }

  /**
   * Refresh session state (call after wallet creation, security setup, etc.)
   */
  async refresh(): Promise<void> {
    await this._performInitialization();
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial: Partial<SessionState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Set up auth state listener (call once on app start)
   */
  setupAuthListener(): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SessionManager] Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        this.updateState({
          session: null,
          user: null,
          isAuthenticated: false,
          hasWallet: false,
          hasSecurity: false,
          isUnlocked: false,
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await this.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}

// Export singleton instance
export const SessionManager = new SessionManagerClass();
