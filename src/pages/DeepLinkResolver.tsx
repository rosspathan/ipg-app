import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { storePendingReferral } from "@/utils/referralCapture";

/**
 * Custom scheme deep link resolver
 * Tries to open the app via custom scheme, falls back to web
 */
export function DeepLinkResolver() {
  const { code } = useParams<{ code: string }>();
  const [fallbackUrl, setFallbackUrl] = useState<string>("");
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const attemptDeepLink = async () => {
      if (!code) {
        window.location.href = '/onboarding';
        return;
      }

      try {
        // Validate referral code first
        const { data: sponsorProfile } = await supabase
          .from('profiles')
          .select('user_id, referral_code')
          .eq('referral_code', code.toUpperCase())
          .maybeSingle();

        if (sponsorProfile) {
          console.log('✅ Valid referral code, storing for web users:', code);
          // Store referral for web users who don't have the app
          storePendingReferral(code.toUpperCase(), sponsorProfile.user_id);
        }

        // Fetch linking settings
        const { data: settings } = await supabase
          .from('mobile_linking_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!settings) {
          console.error('No mobile linking settings found');
          // Fallback to signup with referral code
          setFallbackUrl(`/auth/signup?ref=${code}`);
          setShowFallback(true);
          return;
        }

        // Try custom scheme
        const schemeUrl = `${settings.custom_scheme}://referral/${code}`;
        const webFallbackUrl = `/auth/signup?ref=${code}`;
        
        console.log('🔗 Attempting deep link:', schemeUrl);
        console.log('🌐 Fallback URL:', webFallbackUrl);
        
        setFallbackUrl(webFallbackUrl);

        // Attempt to open via custom scheme
        window.location.href = schemeUrl;

        // If still on page after 1.5s, show fallback (web signup with ref code)
        setTimeout(() => {
          setShowFallback(true);
        }, 1500);
      } catch (error) {
        console.error('Error resolving deep link:', error);
        setFallbackUrl(`/auth/signup?ref=${code}`);
        setShowFallback(true);
      }
    };

    attemptDeepLink();
  }, [code]);

  if (!showFallback) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Opening app...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
      <div className="text-foreground text-lg">App not installed?</div>
      <a
        href={fallbackUrl}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Continue in Browser
      </a>
    </div>
  );
}
