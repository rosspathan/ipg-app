import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Share2, QrCode, Users, TrendingUp, Gift } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { QRCodeCanvas } from 'qrcode.react';

export function ReferralsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { referralCode, settings, stats, shareReferral, loading } = useReferrals();

  // QR rendered via QRCodeCanvas component

  // Early return with loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-referrals-loading">
        <div className="text-muted-foreground">Loading referral data...</div>
      </div>
    );
  }

  // If no code generated yet, show error
  if (!referralCode || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-referrals-error">
        <div className="text-destructive">Failed to generate referral code. Please try again.</div>
      </div>
    );
  }

  const handleBack = () => navigate("/app/profile");

  const handleCopyCode = async () => {
    if (!referralCode) return;
    const success = await copyToClipboard(referralCode.code);
    if (success) {
      toast({ title: "Copied", description: "Referral code copied to clipboard" });
    }
  };

  const handleShare = (method: 'whatsapp' | 'native') => {
    shareReferral(method);
  };

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
                {stats.total_referrals}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Commissions</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${stats.total_commissions.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Referral Code - Main Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 backdrop-blur-xl border border-primary/30">
          <h3 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Code
          </h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="ref-code"
                value={referralCode.code}
                readOnly
                className="font-mono text-2xl font-bold bg-card/80 text-center tracking-wider"
              />
              <Button
                data-testid="ref-copy"
                variant="default"
                size="icon"
                onClick={handleCopyCode}
                className="h-auto"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleShare('native')}
                className="h-12 font-medium"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Code
              </Button>
              
              <Button
                data-testid="ref-whatsapp"
                onClick={() => handleShare('whatsapp')}
                className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
              >
                WhatsApp
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Share this code with friends to earn rewards when they sign up
            </p>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            How It Works
          </h3>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">Share Your Code</p>
                <p className="text-sm text-muted-foreground">Send your referral code to friends via WhatsApp or any app</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">They Sign Up</p>
                <p className="text-sm text-muted-foreground">Friends enter your code during registration or onboarding</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Earn Rewards</p>
                <p className="text-sm text-muted-foreground">Get commissions when they trade and participate</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}