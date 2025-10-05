import { FC, useState, useRef } from 'react';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BadgeIdCard } from './BadgeIdCard';
import { BadgeIdCardBack } from './BadgeIdCardBack';
import { ProfileAvatarUploader } from './ProfileAvatarUploader';
import { BadgeIdExporter } from './BadgeIdExporter';
import { getThemeForTier, getAllTiers, BadgeTier } from './BadgeIdThemeRegistry';
import { buildReferralLink } from './QrLinkBuilder';
import { cn } from '@/lib/utils';

interface BadgeIdCardSheetProps {
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    joinDate: string;
  };
  currentTier: BadgeTier;
  qrCode: string;
  onAvatarUpload: (file: File) => Promise<void>;
  uploadingAvatar?: boolean;
}

export const BadgeIdCardSheet: FC<BadgeIdCardSheetProps> = ({
  user,
  currentTier,
  qrCode,
  onAvatarUpload,
  uploadingAvatar = false
}) => {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<BadgeTier>(currentTier);
  const [showBack, setShowBack] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const theme = getThemeForTier(selectedTier);
  const allTiers = getAllTiers();
  const currentTierIndex = allTiers.indexOf(currentTier);
  const availableTiers = allTiers.slice(0, currentTierIndex + 1);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleSavePNG = async () => {
    if (!frontCardRef.current) return;
    
    setExporting(true);
    try {
      const element = showBack ? backCardRef.current! : frontCardRef.current;
      const filename = BadgeIdExporter.generateFilename(
        user.id,
        selectedTier,
        'png'
      );
      await BadgeIdExporter.exportToPNG(element, filename, 2);
      
      toast({
        title: "Success",
        description: `${selectedTier} badge ID saved as PNG`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PNG",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSavePDF = async () => {
    if (!frontCardRef.current || !backCardRef.current) return;
    
    setExporting(true);
    try {
      const filename = BadgeIdExporter.generateFilename(
        user.id,
        selectedTier,
        'pdf'
      );
      await BadgeIdExporter.exportToPDF(
        frontCardRef.current,
        backCardRef.current,
        filename
      );
      
      toast({
        title: "Success",
        description: `${selectedTier} badge ID saved as PDF (print-ready)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!frontCardRef.current) return;

    try {
      if (navigator.share && navigator.canShare) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Simple share for mobile
        await navigator.share({
          title: 'My i-SMART Badge ID',
          text: `Check out my ${selectedTier} member badge!`,
          url: buildReferralLink(qrCode),
        });
      } else {
        // Fallback: download PNG
        await handleSavePNG();
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyLink = async () => {
    const link = buildReferralLink(qrCode);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="badge-id-card-sheet">
      {/* Avatar Upload Section */}
      <div className="flex justify-center">
        <ProfileAvatarUploader
          avatarUrl={user.avatarUrl}
          displayName={user.displayName}
          uploading={uploadingAvatar}
          onUpload={onAvatarUpload}
        />
      </div>

      {/* Tier Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Select Tier</label>
        <div className="flex flex-wrap gap-2">
          {availableTiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedTier === tier
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {tier}
            </button>
          ))}
        </div>
        {currentTierIndex < allTiers.length - 1 && (
          <p className="text-xs text-muted-foreground">
            Upgrade your account to unlock {allTiers[currentTierIndex + 1]} and higher tiers
          </p>
        )}
      </div>

      {/* Card Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Preview</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBack(!showBack)}
          >
            Show {showBack ? 'Front' : 'Back'}
          </Button>
        </div>

        <div className="flex justify-center">
          <div className="relative">
            {!showBack ? (
              <BadgeIdCard
                ref={frontCardRef}
                user={user}
                tier={selectedTier}
                qrCode={qrCode}
                theme={theme}
                reducedMotion={reducedMotion}
              />
            ) : (
              <BadgeIdCardBack
                ref={backCardRef}
                tier={selectedTier}
                theme={theme}
                reducedMotion={reducedMotion}
              />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleSavePNG}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          Save PNG
        </Button>

        <Button
          variant="outline"
          onClick={handleSavePDF}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          Save PDF
        </Button>

        <Button
          variant="outline"
          onClick={handleShare}
          disabled={exporting}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        <Button
          variant="outline"
          onClick={handleCopyLink}
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>

      {exporting && (
        <div className="text-center text-sm text-muted-foreground">
          Generating high-quality export...
        </div>
      )}
    </div>
  );
};
