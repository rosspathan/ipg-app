import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Image as ImageIcon, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    image_url: string;
    media_type: string | null;
    required_view_time_seconds: number;
    reward_bsk: number;
  };
  isWatched?: boolean;
  onWatch: (ad: AdCardProps['ad']) => void;
  className?: string;
}

export function AdCard({ ad, isWatched = false, onWatch, className }: AdCardProps) {
  const isVideo = ad.media_type === 'video';

  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-300",
      isWatched ? "opacity-50" : "hover:shadow-elevated hover:scale-[1.02]",
      className
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img
          src={ad.image_url}
          alt={ad.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Media Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {isVideo ? (
              <><Play className="w-3 h-3 mr-1" /> Video</>
            ) : (
              <><ImageIcon className="w-3 h-3 mr-1" /> Image</>
            )}
          </Badge>
        </div>

        {/* Reward Badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            +{ad.reward_bsk} BSK
          </Badge>
        </div>

        {/* Watched Overlay */}
        {isWatched && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Already Watched</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground line-clamp-1">
            {ad.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{ad.required_view_time_seconds}s watch time</span>
          </div>
        </div>

        <Button
          onClick={() => onWatch(ad)}
          disabled={isWatched}
          className="w-full"
          variant={isWatched ? "outline" : "default"}
        >
          {isWatched ? 'Watched Today' : `Watch & Earn ${ad.reward_bsk} BSK`}
        </Button>
      </div>
    </Card>
  );
}
