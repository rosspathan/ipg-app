import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";

/**
 * Download page for APK distribution
 * Shows captured referral code and provides both download and intent links
 */
export function DownloadPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    // Check for ref code in URL or sessionStorage
    const urlRef = searchParams.get('ref');
    const sessionRef = sessionStorage.getItem('ipg_ref_code');
    const capturedRef = urlRef || sessionRef;
    
    if (capturedRef) {
      setRefCode(capturedRef);
      sessionStorage.setItem('ipg_ref_code', capturedRef);
      console.log('REF_CAPTURE_OK - Download page:', capturedRef);
    }
  }, [searchParams]);

  const apkUrl = "https://i-smartapp.com/downloads/latest.apk"; // Update with actual APK URL
  const packageName = "com.ismart.exchange";
  
  const intentUrl = refCode 
    ? `intent://r/${encodeURIComponent(refCode)}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=https%3A%2F%2Fi-smartapp.com%2Fdownload%3Fref%3D${encodeURIComponent(refCode)};end`
    : `intent://app#Intent;scheme=https;package=${packageName};S.browser_fallback_url=https%3A%2F%2Fi-smartapp.com%2Fdownload;end`;

  const handleCopyIntent = async () => {
    const success = await copyToClipboard(intentUrl);
    if (success) {
      toast({ title: "Copied", description: "Intent link copied to clipboard" });
    }
  };

  const handleOpenApp = () => {
    window.location.href = intentUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-safe">
      <div className="w-full max-w-md space-y-6">
        {/* Dev Ribbon */}
        <div className="bg-muted border border-border rounded-lg p-2 text-center">
          <p className="text-xs font-mono text-muted-foreground">APK Safe Mode MVP</p>
        </div>

        {/* Main Card */}
        <Card className="p-8 bg-card border border-border">
          <div className="text-center space-y-4 mb-8">
            <div className="w-20 h-20 mx-auto bg-primary/20 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              I-SMART Exchange
            </h1>
            <p className="text-muted-foreground">
              Download the Android app or open if installed
            </p>
          </div>

          {/* Referral Code Display */}
          {refCode && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Referral Code Applied</p>
              <p className="text-lg font-mono font-bold text-success">{refCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Complete registration to claim rewards
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = apkUrl}
              className="w-full h-14 text-lg gap-3"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download APK
            </Button>

            <Button
              onClick={handleOpenApp}
              variant="outline"
              className="w-full h-14 text-lg gap-3"
              size="lg"
            >
              <ExternalLink className="w-5 h-5" />
              Open in App
            </Button>
          </div>

          {/* Intent Link Info */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">
              Android Intent Link (for sharing)
            </p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted/50 rounded-lg overflow-hidden">
                <p className="text-xs font-mono text-foreground break-all line-clamp-2">
                  {intentUrl}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyIntent}
                data-testid="ref-share-intent"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 space-y-2 text-xs text-muted-foreground">
            <p>• <strong>Download APK:</strong> Install the app manually</p>
            <p>• <strong>Open App:</strong> Opens if installed, downloads otherwise</p>
            <p>• Enable "Install from Unknown Sources" in Android settings</p>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>By downloading, you agree to Terms of Service</p>
        </div>
      </div>
    </div>
  );
}
