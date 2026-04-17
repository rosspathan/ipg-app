import { Clock, CheckCircle, XCircle, FileText, AlertTriangle, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Canonical KYC display statuses (matches DB get_kyc_display_status()).
 * Legacy status names ('draft', 'submitted') are mapped to the canonical ones.
 */
export type KYCDisplayStatus =
  | 'not_started'
  | 'draft'
  | 'under_review'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_action'
  | 'suspended';

interface KYCStatusBadgeProps {
  status: KYCDisplayStatus | string;
  className?: string;
  showTooltip?: boolean;
}

const config: Record<string, { icon: any; bg: string; text: string; border: string; label: string; description: string; pulse?: boolean }> = {
  not_started: {
    icon: FileText,
    bg: 'hsl(var(--muted))',
    text: 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    label: 'Not Started',
    description: 'You have not started your KYC application yet.',
  },
  draft: {
    icon: FileText,
    bg: 'hsl(var(--muted))',
    text: 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    label: 'Draft',
    description: 'Your KYC application is in draft status.',
  },
  under_review: {
    icon: Clock,
    bg: 'hsl(208 96% 60% / 0.12)',
    text: 'hsl(208 96% 60%)',
    border: 'hsl(208 96% 60% / 0.35)',
    label: 'Under Review',
    description: 'Your KYC submission is being reviewed by our team.',
    pulse: true,
  },
  submitted: {
    icon: Clock,
    bg: 'hsl(208 96% 60% / 0.12)',
    text: 'hsl(208 96% 60%)',
    border: 'hsl(208 96% 60% / 0.35)',
    label: 'Under Review',
    description: 'Your KYC submission is being reviewed by our team.',
    pulse: true,
  },
  approved: {
    icon: CheckCircle,
    bg: 'hsl(152 64% 48% / 0.12)',
    text: 'hsl(152 64% 48%)',
    border: 'hsl(152 64% 48% / 0.35)',
    label: 'Verified',
    description: 'Your identity has been successfully verified.',
  },
  rejected: {
    icon: XCircle,
    bg: 'hsl(0 84% 60% / 0.12)',
    text: 'hsl(0 84% 60%)',
    border: 'hsl(0 84% 60% / 0.35)',
    label: 'Rejected',
    description: 'Your KYC was rejected. Please resubmit with corrected information.',
  },
  needs_action: {
    icon: AlertTriangle,
    bg: 'hsl(38 92% 55% / 0.12)',
    text: 'hsl(38 92% 55%)',
    border: 'hsl(38 92% 55% / 0.35)',
    label: 'Action Needed',
    description: 'Additional information is required. Please update your KYC.',
  },
  suspended: {
    icon: ShieldOff,
    bg: 'hsl(0 84% 60% / 0.12)',
    text: 'hsl(0 84% 60%)',
    border: 'hsl(0 84% 60% / 0.35)',
    label: 'Suspended',
    description: 'Your KYC verification has been suspended. Contact support.',
  },
};

export function KYCStatusBadge({ status, className, showTooltip = true }: KYCStatusBadgeProps) {
  const cfg = config[status] ?? config['not_started'];
  const { icon: Icon, bg, text, border, label, description, pulse } = cfg;

  const badgeContent = (
    <Badge
      className={cn('flex items-center gap-1.5 border transition-all font-semibold', className)}
      style={{ backgroundColor: bg, color: text, borderColor: border }}
    >
      {pulse ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Icon className="h-3.5 w-3.5" />
        </motion.div>
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </Badge>
  );

  if (!showTooltip) return badgeContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
