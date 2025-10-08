import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Auth Callback Page
 * Handles magic link authentication redirects
 * OTP codes are verified in-app and don't use this route
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Handle the auth callback from magic link
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          toast({
            title: "Welcome back!",
            description: "You've been signed in successfully",
            className: "bg-success/10 border-success/50 text-success",
          });
          
          // Navigate to app home
          navigate('/app/home', { replace: true });
        } else {
          // No session found, redirect to login
          navigate('/auth/login', { replace: true });
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: "Authentication Failed",
          description: error.message || "Please try signing in again",
          variant: "destructive"
        });
        navigate('/auth/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  // Loading state while processing auth
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/80 text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
