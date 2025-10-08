/**
 * Profile management utilities
 * Part of the USERNAME FIX v3
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { extractUsernameFromEmail } from './username';

/**
 * Ensure profile row exists and username is set from email
 * Called after OTP verification and on auth state changes
 */
export async function ensureProfileRowAndUsername(
  sb: SupabaseClient,
  user: { id: string; email?: string } | null
) {
  if (!user?.id) return;

  const emailLocal = user.email ? extractUsernameFromEmail(user.email) : null;

  const { data, error } = await sb
    .from('profiles')
    .select('user_id, username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[ensureProfileRowAndUsername] Query error:', error);
    return;
  }

  if (!data) {
    // No profile row exists, create it
    await sb.from('profiles').insert({ 
      user_id: user.id, 
      username: emailLocal,
      email: user.email 
    });
    console.info('[ensureProfileRowAndUsername] Created profile with username:', emailLocal);
  } else if (!data.username || !data.username.trim() || data.username === 'User') {
    // Profile exists but username is empty/default, update it
    await sb.from('profiles').update({ username: emailLocal }).eq('user_id', user.id);
    console.info('[ensureProfileRowAndUsername] Updated username to:', emailLocal);
  }

  // Notify UI to refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('profile:updated'));
  }
}
