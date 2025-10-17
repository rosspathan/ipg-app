import { FC, useRef, ChangeEvent, useEffect, useState } from 'react';
import { Upload, Camera, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface ProfileAvatarUploaderProps {
  avatarUrl?: string;
  displayName: string;
  uploading?: boolean;
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

const getBadgeColor = (badge: string) => {
  const colors: Record<string, string> = {
    SILVER: 'from-gray-400 to-gray-600',
    GOLD: 'from-yellow-400 to-yellow-600',
    PLATINUM: 'from-cyan-400 to-cyan-600',
    DIAMOND: 'from-blue-400 to-blue-600',
    VIP: 'from-purple-400 to-purple-600',
  };
  return colors[badge.toUpperCase()] || 'from-gray-400 to-gray-600';
};

export const ProfileAvatarUploader: FC<ProfileAvatarUploaderProps> = ({
  avatarUrl,
  displayName,
  uploading = false,
  onUpload,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthUser();
  const [currentBadge, setCurrentBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchBadge = async () => {
      const { data } = await supabase
        .from('user_badge_holdings')
        .select('current_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.current_badge && data.current_badge !== 'NONE') {
        setCurrentBadge(data.current_badge);
      }
    };

    fetchBadge();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_badge_holdings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'current_badge' in payload.new) {
            const badge = (payload.new as any).current_badge;
            setCurrentBadge(badge !== 'NONE' ? badge : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    await onUpload(file);
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} data-testid="avatar-uploader">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-primary/20">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Badge Indicator */}
        {currentBadge && (
          <div
            className={cn(
              "absolute -top-2 -right-2 p-2 rounded-full",
              "bg-gradient-to-br",
              getBadgeColor(currentBadge),
              "shadow-lg border-2 border-background",
              "flex items-center justify-center"
            )}
            title={`${currentBadge} Badge`}
          >
            <Award className="h-4 w-4 text-white" />
          </div>
        )}
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute bottom-0 right-0 p-2 rounded-full",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {uploading ? (
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Best results: 1024×1024px, JPG/PNG
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
