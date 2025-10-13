import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, Share2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Share } from "@capacitor/share";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ReferralShareMVP = () => {
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      
      if (data?.referral_code) {
        setReferralCode(data.referral_code);
      }
    };

    fetchReferralCode();
  }, [user?.id]);

  const shareLink = `https://i-smartapp.com/r/${referralCode}`;
  
  // Android intent link for deep linking
  const intentLink = `intent://r/${referralCode}#Intent;scheme=https;package=com.ismart.exchange;S.browser_fallback_url=https%3A%2F%2Fi-smartapp.com%2Fdownload%3Fref%3D${referralCode};end`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareLink);
    
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    }
  };

  const handleCopyIntent = async () => {
    const success = await copyToClipboard(intentLink);
    
    if (success) {
      toast({
        title: "Copied!",
        description: "Android share link copied",
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: 'Join i-SMART Exchange',
        text: `Join me on i-SMART Exchange! Use my referral code: ${referralCode}`,
        url: shareLink,
        dialogTitle: 'Share Referral Link',
      });

      console.log('REF_SHARE_OK');
    } catch (error) {
      console.error('Share error:', error);
      handleCopyLink();
    }
  };

  if (!referralCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">Loading referral code...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8 pb-safe">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Share & Earn
          </h1>
          <p className="text-sm text-muted-foreground">
            Invite friends and earn rewards
          </p>
        </div>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-base">Your Referral Code</CardTitle>
            <CardDescription className="text-sm">
              Share this code with friends
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-2xl font-mono font-bold tracking-wider text-foreground">
                {referralCode}
              </span>
            </div>

            <div className="space-y-3">
              <Button
                data-testid="ref-share-link"
                onClick={handleNativeShare}
                className="w-full"
                size="lg"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full"
                size="lg"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Web Link
              </Button>

              <Button
                data-testid="ref-share-intent"
                variant="outline"
                onClick={handleCopyIntent}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Copy Android Link
              </Button>
            </div>

            <div className="pt-4 space-y-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Web Link:</strong> Works in any browser
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Android Link:</strong> Opens app directly or downloads if not installed
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Test the links to ensure they work correctly
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralShareMVP;
