import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface AutosaveOptions {
  key: string;
  data: any;
  debounceMs?: number;
}

/**
 * Hook for autosaving form data to localStorage
 * Shows toast notification when saved
 */
export function useKYCAutosave({ key, data, debounceMs = 1000 }: AutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>('');

  const save = useCallback(() => {
    const dataStr = JSON.stringify(data);
    
    // Only save if data changed
    if (dataStr !== previousDataRef.current && Object.keys(data).length > 0) {
      localStorage.setItem(key, dataStr);
      previousDataRef.current = dataStr;
      
      toast('Saved', {
        description: 'Draft saved automatically',
        id: 'kyc-autosave-toast',
        duration: 2000,
      });
      
      console.log('KYC_DRAFT_SAVED:', key);
    }
  }, [key, data]);

  // Debounced save
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, save, debounceMs]);

  // Restore function
  const restore = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('KYC_DRAFT_RESTORED:', key);
        return parsed;
      }
    } catch (error) {
      console.error('Error restoring KYC draft:', error);
    }
    return null;
  }, [key]);

  // Clear function
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    console.log('KYC_DRAFT_CLEARED:', key);
  }, [key]);

  return { restore, clear };
}
