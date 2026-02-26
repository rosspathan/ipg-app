import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Eye, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AdBannerProps {
  ad: {
    id: string;
    title: string;
    image_url: string;
    square_image_url?: string;
    target_url: string;
    reward_bsk: number;
    required_view_time: number;
    placement: string;
    media_type?: string;
  };
  className?: string;
  variant?: 'banner' | 'square';
  onAdClick?: (adId: string) => void;
  disabled?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  className,
  variant = 'banner',
  onAdClick,
  disabled = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const imageUrl = variant === 'square' && ad.square_image_url ? ad.square_image_url : ad.image_url;

  useEffect(() => {
    // Get signed URL from private storage if not an external URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      supabase.storage.from('ad-media')
        .createSignedUrl(imageUrl, 3600) // 1 hour expiry
        .then(({ data, error }) => {
          if (data?.signedUrl) {
            setMediaUrl(data.signedUrl);
          } else {
            console.warn('Failed to get signed URL for ad media:', error);
            setMediaUrl('');
          }
        });
    } else {
      setMediaUrl(imageUrl);
    }
  }, [imageUrl]);

  const handleClick = () => {
    if (!disabled && onAdClick) {
      onAdClick(ad.id);
    }
  };

  const isVideo = ad.media_type === 'video';

  return (
    <Card 
      className={cn(
        "relative overflow-hidden group cursor-pointer transition-all duration-300",
        "bg-card/50 backdrop-blur-sm border-primary/20",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:scale-[1.02]",
        variant === 'banner' ? "aspect-[16/9]" : "aspect-square",
        className
      )}
      onClick={handleClick}
    >
      {/* Background Media */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            src={mediaUrl}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={() => setImageLoaded(true)}
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            alt={ad.title}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = '/placeholder-crypto.svg';
              setImageLoaded(true);
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4">
        {/* Top Section - Reward Badge */}
        <div className="flex justify-end">
          {!disabled && (
            <Badge 
              variant="secondary" 
              className="bg-primary/90 text-primary-foreground backdrop-blur-sm border-0 font-semibold"
            >
              <Coins className="w-3 h-3 mr-1" />
              +{ad.reward_bsk} BSK
            </Badge>
          )}
        </div>

        {/* Bottom Section - Title and Info */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm line-clamp-2 drop-shadow-sm">
            {ad.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-white/80">
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {ad.required_view_time}s
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              View to earn
            </div>
          </div>
        </div>
      </div>

      {/* Disabled Overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Daily limit reached
          </Badge>
        </div>
      )}

      {/* Hover Glow Effect */}
      {!disabled && (
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-lg border-2 border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
        </div>
      )}
    </Card>
  );
};