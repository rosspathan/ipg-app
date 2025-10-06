import { FC, forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QrLinkBuilder } from './QrLinkBuilder';
import { BadgeTheme } from './BadgeIdThemeRegistry';
import { MetalTexture, ClipOverlay } from './MetalTexture';
import { cn } from '@/lib/utils';

interface BadgeIdCardProps {
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    joinDate: string;
  };
  tier: string;
  qrCode: string;
  theme: BadgeTheme;
  reducedMotion?: boolean;
  signatureUrl?: string;
  className?: string;
}

export const BadgeIdCard = forwardRef<HTMLDivElement, BadgeIdCardProps>(
  ({ user, tier, qrCode, theme, reducedMotion = false, signatureUrl, className = '' }, ref) => {
    const formatUID = (id: string) => {
      return `...${id.slice(-4).toLowerCase()}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toISOString().split('T')[0];
    };

    const getSerialNumber = () => {
      return `ISM-${user.id.slice(0, 8).toUpperCase()}`;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-[20px] overflow-hidden shadow-2xl",
          "aspect-[3/5] w-full max-w-[360px]",
          className
        )}
        style={{
          background: theme.gradients.card,
          border: '1px solid rgba(42,47,66,0.16)',
        }}
        data-testid="badge-id-card"
      >
        {/* Metal texture */}
        <MetalTexture opacity={0.06} pattern={theme.effects.pattern} />

        {/* Shine effect */}
        {!reducedMotion && (
          <div 
            className="absolute inset-0 pointer-events-none animate-shine-sweep"
            style={{
              background: theme.gradients.foil,
              backgroundSize: '200% 100%',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Top Rail with Clip */}
          <div className="relative">
            <ClipOverlay className="absolute top-0 left-0 right-0" />
            <div className="relative flex items-center justify-between px-6 h-12">
              <img 
                src="/brand/export/logo_mark.svg" 
                alt="I-SMART" 
                className="h-6 opacity-80"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
              />
              <div 
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.text,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {theme.badge.glyph}
              </div>
            </div>
          </div>

          {/* Medallion Portrait */}
          <div className="flex justify-center mt-8 mb-6">
            <div className="relative">
              {/* Outer glow */}
              {!reducedMotion && (
                <div 
                  className="absolute inset-0 rounded-full animate-pulse-slow"
                  style={{
                    background: `radial-gradient(circle, ${theme.colors.glow}40 0%, transparent 70%)`,
                    filter: 'blur(8px)',
                    transform: 'scale(1.3)',
                  }}
                />
              )}
              
              {/* Concentric rings */}
              <div 
                className="relative rounded-full p-1"
                style={{
                  background: `conic-gradient(from 0deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.primary})`,
                  boxShadow: `0 4px 12px ${theme.colors.glow}40, inset 0 1px 2px rgba(255,255,255,0.3)`,
                }}
              >
                <div 
                  className="rounded-full p-0.5"
                  style={{
                    background: theme.gradients.card,
                  }}
                >
                  <div 
                    className="rounded-full p-1"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    }}
                  >
                    <Avatar className="h-32 w-32 border-2 border-white/80">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback 
                        className="text-4xl font-bold"
                        style={{ 
                          background: theme.colors.primary,
                          color: theme.colors.text 
                        }}
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Title - Engraved Style */}
          <div className="text-center mb-8 px-6">
            <h2 
              className="text-2xl font-bold tracking-wide mb-1"
              style={{
                color: theme.colors.text,
                textShadow: `0 2px 4px rgba(0,0,0,0.15), 0 -1px 1px rgba(255,255,255,0.5)`,
                background: `linear-gradient(180deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {theme.name}
            </h2>
          </div>

          {/* ID Band */}
          <div 
            className="mx-6 mb-6 px-4 py-2 rounded-lg flex items-center justify-between"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">ID</span>
            <span className="font-mono text-sm text-white/90 tabular-nums tracking-widest">
              {formatUID(user.id)}
            </span>
            <svg className="h-4 w-4 text-white/40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 px-6 mb-6">
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: theme.colors.textSecondary }}>
                Name
              </p>
              <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                {user.displayName}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: theme.colors.textSecondary }}>
                Member Since
              </p>
              <p className="text-xs font-mono tabular-nums" style={{ color: theme.colors.text }}>
                {formatDate(user.joinDate)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: theme.colors.textSecondary }}>
                Card No.
              </p>
              <p className="text-xs font-mono tabular-nums" style={{ color: theme.colors.text }}>
                {getSerialNumber()}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: theme.colors.textSecondary }}>
                Level
              </p>
              <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                {tier}
              </p>
            </div>
          </div>

          {/* Signature Line */}
          <div className="px-6 mb-6">
            <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: theme.colors.textSecondary }}>
              Signature
            </p>
            <div className="relative h-12">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="h-full object-contain object-left" />
              ) : (
                <div className="h-full flex items-center text-xs italic opacity-40" style={{ color: theme.colors.textSecondary }}>
                  — Sign to personalize —
                </div>
              )}
              <div 
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, ${theme.colors.primary} 0%, transparent 100%)`,
                }}
              />
            </div>
          </div>

          {/* Security Band */}
          <div 
            className="h-8 mx-6 mb-6 overflow-hidden relative rounded"
            style={{
              background: `repeating-linear-gradient(45deg, ${theme.colors.primary}08, ${theme.colors.primary}08 10px, ${theme.colors.secondary}08 10px, ${theme.colors.secondary}08 20px)`,
              border: `1px solid ${theme.colors.primary}20`,
            }}
          >
            <div className="absolute inset-0 flex items-center whitespace-nowrap animate-marquee-slow">
              <span 
                className="text-[7px] font-mono tracking-[0.3em] opacity-30 px-2"
                style={{ color: theme.colors.textSecondary }}
              >
                I-SMART • VERIFIED MEMBER • OFFICIAL BADGE ID • I-SMART • VERIFIED MEMBER • OFFICIAL BADGE ID •
              </span>
            </div>
          </div>

          {/* QR Block */}
          <div className="px-6 pb-6 mt-auto">
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-widest mb-2 opacity-60" style={{ color: theme.colors.textSecondary }}>
                  Referral Link
                </p>
                <p className="text-[10px] font-mono opacity-70 break-all" style={{ color: theme.colors.text }}>
                  i-smartapp.com/r/{qrCode.slice(0, 8)}...
                </p>
              </div>
              <div 
                className="p-2 rounded-xl ml-4"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <QrLinkBuilder code={qrCode} size={72} />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shine-sweep {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .animate-shine-sweep {
            animation: shine-sweep 8s ease-in-out infinite;
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
          @keyframes marquee-slow {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee-slow {
            animation: marquee-slow 30s linear infinite;
          }
        `}</style>
      </div>
    );
  }
);

BadgeIdCard.displayName = 'BadgeIdCard';
