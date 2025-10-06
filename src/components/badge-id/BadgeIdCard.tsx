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
          "relative rounded-[24px] overflow-hidden",
          "aspect-[3/5] w-full max-w-[360px]",
          "transform-gpu transition-all duration-500",
          "hover:scale-[1.02] hover:shadow-2xl",
          className
        )}
        style={{
          background: theme.gradients.card,
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: `0 20px 60px -15px ${theme.colors.glow}40, 0 0 0 1px rgba(42,47,66,0.08)`,
        }}
        data-testid="badge-id-card"
      >
        {/* Animated background gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${theme.colors.glow}40 0%, transparent 50%),
                         radial-gradient(circle at 80% 80%, ${theme.colors.secondary}30 0%, transparent 50%)`,
          }}
        />

        {/* Metal texture */}
        <MetalTexture opacity={0.08} pattern={theme.effects.pattern} />

        {/* Animated shine sweep */}
        {!reducedMotion && (
          <>
            <div 
              className="absolute inset-0 pointer-events-none animate-shine-sweep"
              style={{
                background: theme.gradients.foil,
                backgroundSize: '200% 100%',
              }}
            />
            {/* Rotating glow */}
            <div 
              className="absolute inset-0 pointer-events-none animate-spin-slow opacity-20"
              style={{
                background: `conic-gradient(from 0deg, transparent 0%, ${theme.colors.glow}60 10%, transparent 20%, transparent 80%, ${theme.colors.glow}60 90%, transparent 100%)`,
              }}
            />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Top Rail with Clip - Enhanced */}
          <div className="relative mb-4">
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: `linear-gradient(180deg, ${theme.colors.primary}40 0%, transparent 100%)`,
                filter: 'blur(20px)',
              }}
            />
            <ClipOverlay className="relative" />
            <div className="relative flex items-center justify-between px-6 h-12">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}60, ${theme.colors.secondary}60)`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <img 
                    src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
                    alt="I-SMART" 
                    className="h-5 w-5 opacity-90 object-contain"
                  />
                </div>
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ 
                    color: theme.colors.text,
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  I-SMART
                </span>
              </div>
              <div 
                className="text-lg font-black px-3 py-1 rounded-full animate-pulse-glow"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                  color: theme.colors.text,
                  boxShadow: `0 4px 12px ${theme.colors.glow}60, inset 0 1px 2px rgba(255,255,255,0.4)`,
                }}
              >
                {theme.badge.glyph}
              </div>
            </div>
          </div>

          {/* Medallion Portrait - Premium 3D Effect */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              {/* Outer animated glow */}
              {!reducedMotion && (
                <>
                  <div 
                    className="absolute inset-0 rounded-full animate-pulse-slow"
                    style={{
                      background: `radial-gradient(circle, ${theme.colors.glow}60 0%, ${theme.colors.primary}40 40%, transparent 70%)`,
                      filter: 'blur(24px)',
                      transform: 'scale(1.4)',
                    }}
                  />
                  <div 
                    className="absolute inset-0 rounded-full animate-spin-slow"
                    style={{
                      background: `conic-gradient(from 0deg, ${theme.colors.primary}80, ${theme.colors.secondary}80, ${theme.colors.primary}80)`,
                      filter: 'blur(16px)',
                      transform: 'scale(1.3)',
                    }}
                  />
                </>
              )}
              
              {/* Outer ring with shimmer */}
              <div 
                className="relative rounded-full p-[3px] group-hover:scale-105 transition-transform duration-500"
                style={{
                  background: `conic-gradient(from 0deg, ${theme.colors.primary}, ${theme.colors.glow}, ${theme.colors.secondary}, ${theme.colors.glow}, ${theme.colors.primary})`,
                  boxShadow: `0 8px 32px ${theme.colors.glow}60, inset 0 2px 4px rgba(255,255,255,0.4)`,
                }}
              >
                {/* Middle ring */}
                <div 
                  className="rounded-full p-1"
                  style={{
                    background: theme.gradients.card,
                  }}
                >
                  {/* Inner ring with gradient */}
                  <div 
                    className="rounded-full p-[2px]"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    }}
                  >
                    {/* White separator */}
                    <div className="rounded-full p-[2px] bg-white/90">
                      <Avatar className="h-36 w-36 border-none shadow-2xl">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback 
                          className="text-5xl font-black"
                          style={{ 
                            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
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
              
              {/* Sparkle effects */}
              {!reducedMotion && (
                <>
                  <div 
                    className="absolute top-0 right-0 w-3 h-3 animate-ping"
                    style={{
                      background: theme.colors.glow,
                      borderRadius: '50%',
                      boxShadow: `0 0 20px ${theme.colors.glow}`,
                    }}
                  />
                  <div 
                    className="absolute bottom-4 left-2 w-2 h-2 animate-ping-slow"
                    style={{
                      background: theme.colors.secondary,
                      borderRadius: '50%',
                      boxShadow: `0 0 15px ${theme.colors.secondary}`,
                      animationDelay: '1s',
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Tier Title - 3D Embossed with Glow */}
          <div className="text-center mb-6 px-6">
            <div className="relative inline-block">
              {!reducedMotion && (
                <div 
                  className="absolute inset-0 blur-xl opacity-60 animate-pulse-glow"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                  }}
                />
              )}
              <h2 
                className="relative text-3xl font-black tracking-tight"
                style={{
                  background: `linear-gradient(180deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 50%, ${theme.colors.primary} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) drop-shadow(0 -1px 2px rgba(255,255,255,0.8))',
                }}
              >
                {theme.name}
              </h2>
            </div>
          </div>

          {/* ID Band - Glassmorphic */}
          <div 
            className="mx-6 mb-5 px-4 py-3 rounded-xl flex items-center justify-between backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">MEMBER ID</span>
            <span className="font-mono text-sm text-white font-bold tabular-nums tracking-[0.3em]">
              {formatUID(user.id)}
            </span>
            <svg className="h-5 w-5 text-white/30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>

          {/* Details Grid - Enhanced */}
          <div className="grid grid-cols-2 gap-3 px-6 mb-5">
            {[
              { label: 'Name', value: user.displayName },
              { label: 'Member Since', value: formatDate(user.joinDate), mono: true },
              { label: 'Card No.', value: getSerialNumber(), mono: true },
              { label: 'Level', value: tier },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl backdrop-blur-sm"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}08, ${theme.colors.secondary}05)`,
                  border: `1px solid ${theme.colors.primary}15`,
                }}
              >
                <p 
                  className="text-[8px] uppercase tracking-[0.2em] mb-1.5 font-bold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {item.label}
                </p>
                <p 
                  className={cn(
                    "text-xs font-bold",
                    item.mono && "font-mono tabular-nums"
                  )}
                  style={{ color: theme.colors.text }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Signature Line - Premium */}
          <div className="px-6 mb-5">
            <div 
              className="p-3 rounded-xl backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}08, ${theme.colors.secondary}05)`,
                border: `1px solid ${theme.colors.primary}15`,
              }}
            >
              <p 
                className="text-[8px] uppercase tracking-[0.2em] mb-2 font-bold"
                style={{ color: theme.colors.textSecondary }}
              >
                Authorized Signature
              </p>
              <div className="relative h-10">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="h-full object-contain object-left" />
                ) : (
                  <div 
                    className="h-full flex items-center text-xs italic"
                    style={{ color: theme.colors.textSecondary, opacity: 0.4 }}
                  >
                    — Tap to sign and personalize —
                  </div>
                )}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Security Band - Animated */}
          <div 
            className="h-8 mx-6 mb-5 overflow-hidden relative rounded-xl backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.secondary}10)`,
              border: `1px solid ${theme.colors.primary}25`,
            }}
          >
            <div className="absolute inset-0 flex items-center whitespace-nowrap animate-marquee-slow">
              <span 
                className="text-[7px] font-mono tracking-[0.3em] font-bold px-2"
                style={{ color: theme.colors.textSecondary, opacity: 0.4 }}
              >
                ★ VERIFIED MEMBER ★ I-SMART OFFICIAL ★ PREMIUM BADGE ★ VERIFIED MEMBER ★ I-SMART OFFICIAL ★ PREMIUM BADGE ★
              </span>
            </div>
          </div>

          {/* QR Block - Premium Glass */}
          <div className="px-6 pb-6 mt-auto">
            <div 
              className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-xl"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}12, ${theme.colors.secondary}08)`,
                border: `1px solid ${theme.colors.primary}30`,
                boxShadow: `0 4px 24px ${theme.colors.glow}15`,
              }}
            >
              <div className="flex-1">
                <p 
                  className="text-[8px] uppercase tracking-[0.2em] mb-2 font-bold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Scan QR Code
                </p>
                <p 
                  className="text-[9px] font-mono font-bold break-all"
                  style={{ color: theme.colors.text, opacity: 0.7 }}
                >
                  i-smartapp.com/r/{qrCode.slice(0, 6)}...
                </p>
              </div>
              <div 
                className="p-2.5 rounded-xl shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}
              >
                <QrLinkBuilder code={qrCode} size={70} />
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
            animation: shine-sweep 6s ease-in-out infinite;
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
          @keyframes pulse-glow {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 8px currentColor); }
            50% { filter: brightness(1.2) drop-shadow(0 0 16px currentColor); }
          }
          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 15s linear infinite;
          }
          @keyframes marquee-slow {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee-slow {
            animation: marquee-slow 25s linear infinite;
          }
          @keyframes ping-slow {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          .animate-ping-slow {
            animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
        `}</style>
      </div>
    );
  }
);

BadgeIdCard.displayName = 'BadgeIdCard';
