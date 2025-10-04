import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Share2, QrCode, Users, TrendingUp } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";

export function ReferralsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { referralLink, config, getReferralUrl, getDeepLink, shareReferral, loading } = useReferrals();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Early return with loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading referral data...</div>
      </div>
    );
  }

  const handleBack = () => navigate("/app/profile");

  const handleCopyLink = async () => {
    const url = getReferralUrl();
    const success = await copyToClipboard(url);
    if (success) {
      toast({ title: "Copied", description: "Referral link copied to clipboard" });
    }
  };

  const handleCopyCode = async () => {
    if (!referralLink) return;
    const success = await copyToClipboard(referralLink.referral_code);
    if (success) {
      toast({ title: "Copied", description: "Referral code copied to clipboard" });
    }
  };

  const handleShare = (method: 'whatsapp' | 'native') => {
    shareReferral(method);
  };

  const url = getReferralUrl();
  const deepLink = getDeepLink();

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-referrals">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Referrals & Invite</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pt-6 px-4">
        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 backdrop-blur-xl border border-primary/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Total Referrals</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {referralLink?.total_referrals || 0}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Commissions</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${referralLink?.total_commissions.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </Card>

        {/* Referral Code */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Your Referral Code
          </h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={referralLink?.referral_code || ''}
                readOnly
                className="font-mono text-lg font-bold bg-muted text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Share this code with friends to earn rewards
            </p>
          </div>
        </Card>

        {/* Referral Link */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Referral Link
          </h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleShare('native')}
                className="h-12"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button
                onClick={() => handleShare('whatsapp')}
                className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </Card>

        {/* QR Code */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-bold text-foreground">
              QR Code
            </h3>
            <QrCode className="h-5 w-5 text-primary" />
          </div>

          <div className="flex items-center justify-center p-8 bg-white rounded-xl">
            {/* QR Code Canvas - would need QR generation library */}
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-24 w-24 text-muted-foreground" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Scan this QR code to open the referral link
          </p>
        </Card>

        {/* Deep Link Info */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Android Deep Link
          </h3>

          <div className="space-y-2">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Universal Link</p>
              <p className="text-xs font-mono text-foreground break-all">{url}</p>
            </div>

            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Deep Link Scheme</p>
              <p className="text-xs font-mono text-foreground break-all">{deepLink}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}