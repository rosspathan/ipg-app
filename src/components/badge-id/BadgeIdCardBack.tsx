import { FC, forwardRef } from 'react';
import { BadgeTheme } from './BadgeIdThemeRegistry';
import { MetalTexture } from './MetalTexture';
import { cn } from '@/lib/utils';
import { Shield, Users, TrendingUp, Gift, MessageCircle, Award } from 'lucide-react';
import { SupportLinkWhatsApp } from '@/components/support/SupportLinkWhatsApp';

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
          "relative rounded-[20px] overflow-hidden shadow-2xl",
          "aspect-[3/5] w-full max-w-[360px]",
          className
        )}
        style={{
          background: theme.gradients.card,
          border: '1px solid rgba(42,47,66,0.16)',
        }}
        data-testid="badge-id-card-back"
      >
        {/* Metal texture */}
        <MetalTexture opacity={0.04} pattern={theme.effects.pattern} />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                color: theme.colors.text,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <Award className="h-4 w-4" />
              <span>{theme.name}</span>
            </div>
            <h3 
              className="text-base font-bold uppercase tracking-wide"
              style={{ 
                color: theme.colors.text,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              Membership Benefits
            </h3>
          </div>

          {/* Benefits Grid */}
          <div className="flex-1 space-y-2.5 mb-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2.5 p-2 rounded-lg"
                style={{
                  background: `${theme.colors.primary}05`,
                }}
              >
                <div 
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.secondary}40)`,
                  }}
                >
                  {index < 2 ? <Users className="h-3 w-3" style={{ color: theme.colors.text }} /> :
                   index < 4 ? <TrendingUp className="h-3 w-3" style={{ color: theme.colors.text }} /> :
                   index < 6 ? <Shield className="h-3 w-3" style={{ color: theme.colors.text }} /> :
                   <Gift className="h-3 w-3" style={{ color: theme.colors.text }} />}
                </div>
                <p 
                  className="text-[11px] leading-relaxed font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {benefit}
                </p>
              </div>
            ))}
          </div>

          {/* Rules Section */}
          <div 
            className="p-3 rounded-xl mb-4"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}12, ${theme.colors.secondary}08)`,
              border: `1px solid ${theme.colors.primary}25`,
            }}
          >
            <h4 
              className="text-[10px] font-bold mb-2 uppercase tracking-widest flex items-center gap-1.5"
              style={{ color: theme.colors.text }}
            >
              <Shield className="h-3 w-3" />
              Membership Rules
            </h4>
            <ul 
              className="text-[9px] space-y-1 leading-relaxed"
              style={{ color: theme.colors.textSecondary }}
            >
              <li>• Tier upgrades based on trading volume and activity</li>
              <li>• Referral commissions distributed monthly</li>
              <li>• All benefits subject to terms & conditions</li>
              <li>• Card remains property of I-SMART Exchange</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <SupportLinkWhatsApp
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{
                  background: `${theme.colors.primary}18`,
                  border: `1px solid ${theme.colors.primary}35`,
                  color: theme.colors.text
                }}
              >
                <MessageCircle className="h-3 w-3" />
                <span className="text-[10px] font-semibold">+91 91334 44118</span>
              </SupportLinkWhatsApp>
            </div>
            
            <div className="text-center">
              <p 
                className="text-xs font-bold mb-0.5"
                style={{ color: theme.colors.text }}
              >
                I-SMART EXCHANGE
              </p>
              <p 
                className="text-[10px] opacity-70"
                style={{ color: theme.colors.textSecondary }}
              >
                www.i-smartapp.com
              </p>
            </div>

            <div 
              className="text-center pt-2 mt-2"
              style={{
                borderTop: `1px solid ${theme.colors.primary}20`,
              }}
            >
              <p 
                className="text-[8px] opacity-50 leading-relaxed"
                style={{ color: theme.colors.textSecondary }}
              >
                This card is the exclusive property of the member.
                <br />
                Report lost or stolen cards immediately to support.
              </p>
            </div>
          </div>

          {/* Security watermark */}
          <div 
            className="absolute inset-0 opacity-3 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                ${theme.colors.primary}15 0,
                ${theme.colors.primary}15 1px,
                transparent 1px,
                transparent 8px
              )`,
            }}
          />
        </div>
      </div>
    );
  }
);

BadgeIdCardBack.displayName = 'BadgeIdCardBack';
