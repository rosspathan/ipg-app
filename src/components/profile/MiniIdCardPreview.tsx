import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniIdCardPreviewProps {
  avatarUrl?: string;
  displayName: string;
  email: string;
  badge: string | null;
  userId: string;
  className?: string;
}

const BADGE_COLORS: Record<string, { from: string; to: string; glow: string; text: string }> = {
  Silver: {
    from: 'from-slate-400/30',
    to: 'to-slate-300/20',
    glow: 'shadow-[0_0_30px_rgba(203,213,225,0.3)]',
    text: 'text-slate-200'
  },
  Gold: {
    from: 'from-yellow-500/30',
    to: 'to-amber-400/20',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]',
    text: 'text-yellow-200'
  },
  Platinum: {
    from: 'from-cyan-400/30',
    to: 'to-blue-400/20',
    glow: 'shadow-[0_0_30px_rgba(34,211,238,0.4)]',
    text: 'text-cyan-200'
  },
  Diamond: {
    from: 'from-cyan-500/30',
    to: 'to-blue-500/20',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.5)]',
    text: 'text-cyan-100'
  },
  VIP: {
    from: 'from-purple-500/30',
    to: 'to-pink-500/20',
    glow: 'shadow-[0_0_40px_rgba(168,85,247,0.5)]',
    text: 'text-purple-100'
  },
  'i-Smart VIP': {
    from: 'from-purple-500/30',
    to: 'to-cyan-500/20',
    glow: 'shadow-[0_0_40px_rgba(168,85,247,0.5)]',
    text: 'text-purple-100'
  }
};

export const MiniIdCardPreview: FC<MiniIdCardPreviewProps> = ({
  avatarUrl,
  displayName,
  email,
  badge,
  userId,
  className = ''
}) => {
  const navigate = useNavigate();
  const badgeStyle = badge && badge !== 'None' ? BADGE_COLORS[badge] : BADGE_COLORS.Silver;

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
    return `${localPart.slice(0, 2)}***@${domain}`;
  };

  return (
    <button
      onClick={() => navigate('/app/profile/id-card')}
      className={cn(
        "group relative w-full rounded-2xl overflow-hidden transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
    >
      {/* Glassmorphic background with gradient */}
      <div
        className={cn(
          "relative p-6 backdrop-blur-xl bg-gradient-to-br",
          badgeStyle.from,
          badgeStyle.to,
          badgeStyle.glow,
          "border border-white/10"
        )}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        
        {/* Sparkle decoration */}
        <div className="absolute top-4 right-4 opacity-60">
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
        </div>

        {/* Content */}
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar with glow */}
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-full blur-md opacity-50",
                badgeStyle.from
              )} />
              <Avatar className="relative h-16 w-16 border-2 border-white/20 shadow-lg">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className={cn(
                  "text-2xl font-bold backdrop-blur-sm",
                  badgeStyle.from
                )}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-lg font-bold text-white truncate">
                  {displayName}
                </h3>
                {badge && badge !== 'None' && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    "bg-white/20 backdrop-blur-sm border border-white/30",
                    badgeStyle.text
                  )}>
                    {badge}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-white/70 font-mono mb-1 truncate">
                {maskEmail(email)}
              </p>
              
              <p className="text-xs text-white/50 font-mono">
                ID: {userId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex flex-col items-center gap-1">
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
              View
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
          badgeStyle.from,
          badgeStyle.to,
          "opacity-50"
        )} />
      </div>
    </button>
  );
};
