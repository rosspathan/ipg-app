/**
 * Hook for managing encrypted wallet backups
 * 
 * Provides functions to:
 * - Check if a server backup exists
 * - Create/update encrypted backup
 * - Retrieve and decrypt backup
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  encryptSeedPhrase, 
  decryptSeedPhrase, 
  isEncryptionSupported 
} from '@/utils/walletEncryption';
import { useToast } from '@/hooks/use-toast';

export interface BackupStatus {
  exists: boolean;
  walletAddress?: string;
  createdAt?: string;
  loading: boolean;
}

export function useEncryptedWalletBackup() {
  const { toast } = useToast();
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    exists: false,
    loading: true
  });

  /**
   * Check if a backup exists for the current user
   */
  const checkBackupExists = useCallback(async (userId?: string): Promise<BackupStatus> => {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        setBackupStatus({ exists: false, loading: false });
        return { exists: false, loading: false };
      }

      const { data, error } = await supabase
        .from('encrypted_wallet_backups')
        .select('wallet_address, created_at')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[BACKUP] Error checking backup:', error);
      }

      const status: BackupStatus = {
        exists: !!data,
        walletAddress: data?.wallet_address,
        createdAt: data?.created_at,
        loading: false
      };

      setBackupStatus(status);
      return status;
    } catch (error) {
      console.error('[BACKUP] Check failed:', error);
      setBackupStatus({ exists: false, loading: false });
      return { exists: false, loading: false };
    }
  }, []);

  /**
   * Create or update encrypted backup
   */
  const createBackup = useCallback(async (
    seedPhrase: string,
    walletAddress: string,
    pin: string
  ): Promise<boolean> => {
    if (!isEncryptionSupported()) {
      toast({
        title: "Encryption Not Supported",
        description: "Your browser doesn't support the required encryption features.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast({
          title: "Not Logged In",
          description: "Please log in to backup your wallet.",
          variant: "destructive"
        });
        return false;
      }

      // Encrypt the seed phrase
      const { encryptedData, iv, salt } = await encryptSeedPhrase(seedPhrase, pin);

      // Upsert the backup
      const { error } = await supabase
        .from('encrypted_wallet_backups')
        .upsert({
          user_id: user.id,
          encrypted_data: encryptedData,
          iv,
          salt,
          wallet_address: walletAddress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[BACKUP] Create error:', error);
        toast({
          title: "Backup Failed",
          description: "Failed to save encrypted backup.",
          variant: "destructive"
        });
        return false;
      }

      console.log('[BACKUP] Wallet backup created successfully');
      setBackupStatus({
        exists: true,
        walletAddress,
        createdAt: new Date().toISOString(),
        loading: false
      });

      return true;
    } catch (error) {
      console.error('[BACKUP] Create failed:', error);
      toast({
        title: "Backup Error",
        description: "An error occurred while backing up your wallet.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  /**
   * Retrieve and decrypt backup
   */
  const retrieveBackup = useCallback(async (pin: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast({
          title: "Not Logged In",
          description: "Please log in to retrieve your wallet.",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase
        .from('encrypted_wallet_backups')
        .select('encrypted_data, iv, salt')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('[BACKUP] Retrieve error:', error);
        toast({
          title: "No Backup Found",
          description: "No encrypted backup exists for your account.",
          variant: "destructive"
        });
        return null;
      }

      // Decrypt
      const seedPhrase = await decryptSeedPhrase(
        data.encrypted_data,
        data.iv,
        data.salt,
        pin
      );

      console.log('[BACKUP] Wallet backup retrieved and decrypted successfully');
      return seedPhrase;
    } catch (error: any) {
      console.error('[BACKUP] Retrieve failed:', error);
      
      if (error.message === 'Invalid PIN or corrupted data') {
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is incorrect.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Decryption Failed",
          description: "Failed to decrypt your wallet backup.",
          variant: "destructive"
        });
      }
      return null;
    }
  }, [toast]);

  return {
    backupStatus,
    checkBackupExists,
    createBackup,
    retrieveBackup
  };
}
