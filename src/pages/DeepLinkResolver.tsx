import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

      // Fetch settings to get custom scheme and fallback
      const response = await fetch(
        'https://ocblgldglqhlrmtnynmu.supabase.co/rest/v1/mobile_linking_settings?select=*&order=created_at.desc&limit=1',
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxnbGRnbHFobHJtdG55bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MjYwNTYsImV4cCI6MjA3MTMwMjA1Nn0.aW57QcWFW0aInebAK1m1RsvSkvtayUWPT7uv40OpQ8A'
          }
        }
      );
      const data = await response.json();
      const settings = data[0];

      if (!settings) {
        window.location.href = '/onboarding';
        return;
      }

      // Try custom scheme
      const schemeUrl = `${settings.custom_scheme}://r/${code}`;
      const webUrl = `${settings.host}${settings.ref_base_path}/${code}`;
      
      setFallbackUrl(settings.play_store_fallback_url || webUrl);

      // Attempt to open via custom scheme
      window.location.href = schemeUrl;

      // If still on page after 1.5s, show fallback
      setTimeout(() => {
        setShowFallback(true);
      }, 1500);
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
