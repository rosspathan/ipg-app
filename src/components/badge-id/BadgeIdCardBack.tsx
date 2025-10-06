import { FC, forwardRef } from 'react';
import { BadgeTheme } from './BadgeIdThemeRegistry';
import { HoloFx } from './HoloFx';
import { cn } from '@/lib/utils';
import { Shield, Users, TrendingUp, Gift, MessageCircle } from 'lucide-react';
import { APP_CONFIG } from '@/config/app';
import { openWhatsApp } from '@/lib/openWhatsApp';

interface BadgeIdCardBackProps {
  tier: string;
  theme: BadgeTheme;
  reducedMotion?: boolean;
  className?: string;
}

const TIER_BENEFITS: Record<string, string[]> = {
  Silver: [
    'Access to basic trading features',
    '10% referral commission',
    'Standard customer support',
    'Monthly market insights'
  ],
  Gold: [
    'Enhanced trading limits',
    '10% referral commission + bonuses',
    'Priority customer support',
    'Weekly market analysis',
    'Exclusive community access'
  ],
  Platinum: [
    'Premium trading features',
    '10% referral commission + premium bonuses',
    'VIP customer support 24/7',
    'Daily market insights',
    'Advanced tools & analytics',
    'Special event invitations'
  ],
  Diamond: [
    'Elite trading privileges',
    '10% referral commission + elite bonuses',
    'Dedicated account manager',
    'Real-time market alerts',
    'Professional trading tools',
    'Exclusive networking events',
    'Early access to new features'
  ],
  VIP: [
    'Ultimate trading experience',
    '10% referral commission + VIP rewards',
    'Personal concierge service',
    'Custom market research',
    'Institutional-grade tools',
    'Private networking events',
    'Priority feature requests',
    'Lifetime membership benefits'
  ]
};

export const BadgeIdCardBack = forwardRef<HTMLDivElement, BadgeIdCardBackProps>(
  ({ tier, theme, reducedMotion = false, className = '' }, ref) => {
    const benefits = TIER_BENEFITS[tier] || TIER_BENEFITS.Silver;

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
        data-testid="badge-id-card-back"
      >
        {/* Background effects */}
        <HoloFx 
          intensity={theme.effects.holoIntensity * 0.5} 
          disabled={reducedMotion}
        />
        
        {/* Edge glow */}
        <div 
          className="absolute inset-0 rounded-[20px] pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${theme.colors.primary}40`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div 
              className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-3"
              style={{
                background: theme.gradients.ribbon,
                color: theme.colors.text,
              }}
            >
              {tier} MEMBER
            </div>
            <h3 
              className="text-lg font-bold"
              style={{ color: theme.colors.text }}
            >
              Membership Benefits
            </h3>
          </div>

          {/* Benefits list */}
          <div className="flex-1 space-y-3 mb-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <div 
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: theme.colors.primary }}
                >
                  {index < 2 ? <Users className="h-4 w-4" /> :
                   index < 4 ? <TrendingUp className="h-4 w-4" /> :
                   index < 6 ? <Shield className="h-4 w-4" /> :
                   <Gift className="h-4 w-4" />}
                </div>
                <p 
                  className="text-xs leading-relaxed"
                  style={{ color: theme.colors.text }}
                >
                  {benefit}
                </p>
              </div>
            ))}
          </div>

          {/* Rules section */}
          <div 
            className="p-4 rounded-lg mb-4"
            style={{
              background: `${theme.colors.primary}10`,
              border: `1px solid ${theme.colors.primary}20`,
            }}
          >
            <h4 
              className="text-xs font-bold mb-2 uppercase tracking-wider"
              style={{ color: theme.colors.text }}
            >
              Membership Rules
            </h4>
            <ul 
              className="text-[10px] space-y-1 opacity-80"
              style={{ color: theme.colors.textSecondary }}
            >
              <li>• Tier upgrades based on trading volume</li>
              <li>• Referral commissions paid monthly</li>
              <li>• Benefits subject to terms & conditions</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => openWhatsApp(APP_CONFIG.WHATSAPP_PHONE, "Hello iSmart support")}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                style={{
                  background: `${theme.colors.primary}15`,
                  border: `1px solid ${theme.colors.primary}30`,
                  color: theme.colors.text
                }}
              >
                <MessageCircle className="h-3 w-3" />
                <span className="text-[10px] font-medium">{APP_CONFIG.WHATSAPP_PHONE}</span>
              </button>
            </div>
            <p 
              className="text-[10px] opacity-60"
              style={{ color: theme.colors.textSecondary }}
            >
              I-SMART EXCHANGE
            </p>
            <p 
              className="text-[10px] opacity-60"
              style={{ color: theme.colors.textSecondary }}
            >
              www.i-smartapp.com
            </p>
            <p 
              className="text-[9px] opacity-40 mt-1"
              style={{ color: theme.colors.textSecondary }}
            >
              This card is the exclusive property of the member.
              <br />
              Report lost/stolen cards immediately.
            </p>
          </div>

          {/* Watermark grid */}
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                ${theme.colors.primary}20 0,
                ${theme.colors.primary}20 2px,
                transparent 2px,
                transparent 12px
              )`,
            }}
          />
        </div>
      </div>
    );
  }
);

BadgeIdCardBack.displayName = 'BadgeIdCardBack';
