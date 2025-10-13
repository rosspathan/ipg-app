import { Preferences } from '@capacitor/preferences';
import type { SupabaseClientOptions } from '@supabase/supabase-js';

/**
 * Capacitor Preferences Storage Adapter for Supabase
 * Ensures session persistence across app restarts in native apps
 */
export const capacitorStorage: SupabaseClientOptions<any>['auth']['storage'] = {
  async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      console.log('[CapacitorStorage] getItem:', key, value ? 'found' : 'not found');
      return value;
    } catch (error) {
      console.error('[CapacitorStorage] getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
      console.log('[CapacitorStorage] setItem:', key, 'saved');
    } catch (error) {
      console.error('[CapacitorStorage] setItem error:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
      console.log('[CapacitorStorage] removeItem:', key);
    } catch (error) {
      console.error('[CapacitorStorage] removeItem error:', error);
    }
  },
};
