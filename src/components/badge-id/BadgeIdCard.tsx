import { FC, forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QrLinkBuilder } from './QrLinkBuilder';
import { HoloFx } from './HoloFx';
import { BadgeTheme } from './BadgeIdThemeRegistry';
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
  className?: string;
}

export const BadgeIdCard = forwardRef<HTMLDivElement, BadgeIdCardProps>(
  ({ user, tier, qrCode, theme, reducedMotion = false, className = '' }, ref) => {
    const maskEmail = (email: string) => {
      const [localPart, domain] = email.split('@');
      if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
      return `${localPart.slice(0, 2)}***@${domain}`;
    };

    const formatUID = (id: string) => {
      return `...${id.slice(-8).toUpperCase()}`;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-[20px] overflow-hidden",
          "aspect-[3/5] w-full max-w-[360px]",
          className
        )}
        style={{
          background: theme.gradients.card,
        }}
        data-testid="badge-id-card"
      >
        {/* Background effects */}
        <HoloFx 
          intensity={theme.effects.holoIntensity} 
          disabled={reducedMotion}
        />
        
        {/* Edge glow */}
        <div 
          className="absolute inset-0 rounded-[20px] pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${theme.colors.primary}40, 0 0 40px ${theme.colors.glow}20`,
          }}
        />

        {/* Content wrapper */}
        <div className="relative z-10 h-full flex flex-col p-6">
          {/* Header: Logo + Tier Ribbon */}
          <div className="flex items-start justify-between mb-6">
            <img 
              src="/brand/export/wordmark.svg" 
              alt="I-SMART" 
              className="h-8 opacity-90"
            />
            <div 
              className="px-4 py-2 rounded-full text-xs font-bold tracking-wider shadow-lg"
              style={{
                background: theme.gradients.ribbon,
                color: theme.colors.text,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {tier}
            </div>
          </div>

          {/* Profile section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <div 
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${theme.colors.glow}40 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                }}
              />
              <div 
                className="relative rounded-full p-1"
                style={{
                  background: theme.gradients.ribbon,
                  boxShadow: `0 0 20px ${theme.colors.glow}60`,
                }}
              >
                <Avatar className="h-28 w-28 border-4 border-background">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback 
                    className="text-3xl font-bold"
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

            <h3 
              className="text-2xl font-bold mb-1 text-center font-heading"
              style={{ color: theme.colors.text }}
            >
              {user.displayName}
            </h3>
            <p 
              className="text-xs font-mono opacity-70"
              style={{ color: theme.colors.textSecondary }}
            >
              {formatUID(user.id)}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60 mb-1" style={{ color: theme.colors.textSecondary }}>
                Email
              </p>
              <p className="text-xs font-mono" style={{ color: theme.colors.text }}>
                {maskEmail(user.email)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60 mb-1" style={{ color: theme.colors.textSecondary }}>
                Member Since
              </p>
              <p className="text-xs" style={{ color: theme.colors.text }}>
                {new Date(user.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Security band */}
          <div 
            className="h-6 mb-6 overflow-hidden relative rounded"
            style={{
              background: `linear-gradient(90deg, ${theme.colors.primary}10, ${theme.colors.secondary}10)`,
              borderTop: `1px solid ${theme.colors.primary}20`,
              borderBottom: `1px solid ${theme.colors.primary}20`,
            }}
          >
            <div className="absolute inset-0 flex items-center whitespace-nowrap animate-marquee">
              <span 
                className="text-[8px] font-mono tracking-widest opacity-40 px-2"
                style={{ color: theme.colors.textSecondary }}
              >
                I-SMART EXCHANGE • VERIFIED MEMBER • I-SMART EXCHANGE • VERIFIED MEMBER •
              </span>
            </div>
          </div>

          {/* QR + Footer */}
          <div className="mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider mb-1 opacity-60" style={{ color: theme.colors.textSecondary }}>
                  Referral Link
                </p>
                <p className="text-xs opacity-80" style={{ color: theme.colors.text }}>
                  Scan or visit link
                </p>
              </div>
              <div 
                className="p-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                }}
              >
                <QrLinkBuilder code={qrCode} size={80} />
              </div>
            </div>

            {/* Badge glyph */}
            {theme.badge.position === 'bottom-right' && (
              <div 
                className="absolute bottom-4 right-4 text-4xl opacity-20"
                style={{ color: theme.colors.primary }}
              >
                {theme.badge.glyph}
              </div>
            )}
          </div>
        </div>

        {/* Hologram seal */}
        <div 
          className="absolute bottom-6 left-6 w-12 h-12 rounded-full"
          style={{
            background: `radial-gradient(circle, ${theme.colors.glow}60, transparent)`,
            boxShadow: `0 0 20px ${theme.colors.glow}80`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-xl opacity-70" style={{ color: theme.colors.primary }}>
            ✓
          </div>
        </div>

        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}</style>
      </div>
    );
  }
);

BadgeIdCard.displayName = 'BadgeIdCard';
