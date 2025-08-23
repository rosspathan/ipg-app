// Utility to add timeout to any async function
export const fetchWithTimeout = <T>(
  fetchFn: () => Promise<T>,
  options: { ms?: number } = {}
): Promise<T> => {
  const timeoutMs = options.ms || 10000; // Default 10 seconds

  return Promise.race([
    fetchFn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timed out fetching assets'));
      }, timeoutMs);
    })
  ]);
};

// Helper to detect RLS permission errors
export const isPermissionError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';
  
  return (
    message.includes('permission denied') ||
    message.includes('rls') ||
    message.includes('row-level security') ||
    code === 'PGRST301' ||
    code === '42501'
  );
};

// Helper to create human-readable error messages
export const getErrorMessage = (error: any): string => {
  if (!navigator.onLine) {
    return "You're offline. Please check your internet connection.";
  }
  
  if (isPermissionError(error)) {
    return `Permission denied reading assets. Database policy may need updating: ${error.message}`;
  }
  
  if (error.message?.includes('timeout')) {
    return 'Timed out fetching assets. Please try again.';
  }
  
  return error.message || 'An unknown error occurred';
};