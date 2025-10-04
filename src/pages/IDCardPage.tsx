import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Download, Share2, QrCode } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useAvatar } from "@/hooks/useAvatar";
import { useKYCNew } from "@/hooks/useKYCNew";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function IDCardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { userApp } = useProfile();
  const { avatar, uploadAvatar, getAvatarUrl, uploading } = useAvatar();
  const { profiles } = useKYCNew();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => navigate("/app/profile");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveCard = () => {
    toast({ title: "Info", description: "Card save feature coming soon" });
  };

  const handleShareCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My i-Smart ID Card',
          text: 'Check out my verified i-Smart profile!',
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      toast({ title: "Info", description: "Sharing not supported on this device" });
    }
  };

  const avatarUrl = getAvatarUrl('1x');
  const displayName = userApp?.full_name || user?.email?.split('@')[0] || 'User';
  const kycLevel = Object.entries(profiles).reverse().find(([_, p]) => p?.status === 'approved')?.[0];

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-idcard">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Avatar & Badge ID</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pt-6 px-4">
        {/* Avatar Upload */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-lg font-bold text-foreground mb-4">
            Profile Avatar
          </h3>
          
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-primary/20" data-testid="avatar-uploader">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                Upload a profile photo (recommended: 512x512px)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
        </Card>

        {/* Badge ID Card */}
        <Card 
          className="p-6 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 backdrop-blur-xl border border-primary/30 relative overflow-hidden"
          data-testid="badge-id-card"
        >
          {/* Decorative border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-20 animate-pulse" />
          
          <div className="relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {user?.email}
                  </p>
                </div>
              </div>

              {kycLevel && (
                <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                  ✓ {kycLevel}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/20">
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="text-sm font-mono text-foreground">
                  {user?.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Badge</p>
                <p className="text-sm font-bold text-warning">VIP Gold</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm text-foreground">
                  {new Date(userApp?.created_at || Date.now()).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-success">Active</p>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="pt-4 border-t border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Scan to verify</p>
                  <p className="text-xs font-mono text-foreground">Referral QR</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground">i-Smart</p>
                <p className="text-xs font-bold text-primary">VERIFIED MEMBER</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleSaveCard}
            className="h-12"
          >
            <Download className="h-4 w-4 mr-2" />
            Save ID
          </Button>
          
          <Button
            onClick={handleShareCard}
            className="h-12"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}