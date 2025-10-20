import { supabase } from "@/integrations/supabase/client";

/**
 * Session Conflict Detector
 * 
 * Detects and resolves conflicts between Supabase auth sessions and Web3 wallet ownership.
 * In a Web3-first app, the wallet address is the primary identity, not Supabase sessions.
 * 
 * This utility ensures that if a Supabase session exists but doesn't match the wallet's
 * linked user, the wrong session is cleared to prevent displaying incorrect user data.
 */

export async function detectAndResolveSessionConflict(walletAddress: string) {
  try {
    // Check for existing Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('[SESSION_CONFLICT] ✓ No Supabase session - Web3-only mode');
      return { conflict: false };
    }

    console.log('[SESSION_CONFLICT] Checking session vs wallet ownership...', {
      sessionUser: session.user.email,
      sessionUserId: session.user.id,
      walletAddress
    });

    // Find the user_id that owns this wallet in profiles table
    const { data: walletProfile, error: walletError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (walletError) {
      console.error('[SESSION_CONFLICT] Error querying wallet ownership:', walletError);
      return { conflict: false };
    }

    if (!walletProfile) {
      console.log('[SESSION_CONFLICT] Wallet not linked to any user yet (new wallet)');
      return { conflict: false };
    }

    // Check if session user matches wallet owner
    if (session.user.id !== walletProfile.user_id) {
      console.warn('[SESSION_CONFLICT] ⚠️ CONFLICT DETECTED:', {
        supabaseSession: session.user.email,
        sessionUserId: session.user.id,
        walletOwner: walletProfile.user_id,
        walletAddress
      });

      // DO NOT sign out automatically - emit event for user to choose
      window.dispatchEvent(new CustomEvent('auth:session_conflict', {
        detail: {
          sessionUserId: session.user.id,
          sessionEmail: session.user.email,
          walletOwnerUserId: walletProfile.user_id,
          walletAddress
        }
      }));
      
      return { 
        conflict: true, 
        resolved: false,
        details: {
          sessionEmail: session.user.email,
          sessionUserId: session.user.id,
          walletOwnerUserId: walletProfile.user_id
        }
      };
    }

    console.log('[SESSION_CONFLICT] ✓ Session matches wallet owner');
    return { conflict: false };

  } catch (error) {
    console.error('[SESSION_CONFLICT] Error during conflict detection:', error);
    return { conflict: false, error };
  }
}
