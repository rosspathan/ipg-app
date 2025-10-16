import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface KYCStatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  className?: string;
  showTooltip?: boolean;
}

export function KYCStatusBadge({ status, className, showTooltip = true }: KYCStatusBadgeProps) {
  const config = {
    draft: {
      icon: FileText,
      bg: 'hsl(var(--muted))',
      text: 'hsl(var(--muted-foreground))',
      border: 'hsl(var(--border))',
      label: 'Draft',
      description: 'Your KYC application is in draft status'
    },
    submitted: {
      icon: Clock,
      bg: 'hsl(33 93% 60% / 0.1)',
      text: 'hsl(33 93% 60%)',
      border: 'hsl(33 93% 60% / 0.3)',
      label: 'Under Review',
      description: 'Your KYC application is being reviewed by our team'
    },
    approved: {
      icon: CheckCircle,
      bg: 'hsl(152 64% 48% / 0.1)',
      text: 'hsl(152 64% 48%)',
      border: 'hsl(152 64% 48% / 0.3)',
      label: 'Verified',
      description: 'Your identity has been successfully verified'
    },
    rejected: {
      icon: XCircle,
      bg: 'hsl(0 84% 60% / 0.1)',
      text: 'hsl(0 84% 60%)',
      border: 'hsl(0 84% 60% / 0.3)',
      label: 'Rejected',
      description: 'Your KYC application was rejected. Please resubmit with correct information'
    }
  };

  const { icon: Icon, bg, text, border, label, description } = config[status];

  const badgeContent = (
    <Badge
      className={cn('flex items-center gap-1.5 border transition-all', className)}
      style={{
        backgroundColor: bg,
        color: text,
        borderColor: border
      }}
    >
      {status === 'submitted' ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </motion.div>
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
