import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OnboardingCardProps {
  children: ReactNode;
  variant?: 'glass' | 'glass-dark' | 'gradient' | 'success' | 'info' | 'warning';
  hover?: boolean;
  className?: string;
}

export const OnboardingCard = forwardRef<HTMLDivElement, OnboardingCardProps>(
  ({ children, variant = 'glass', hover = false, className }, ref) => {
    const variants = {
      glass: 'bg-black/40 backdrop-blur-md border border-white/30',
      'glass-dark': 'bg-black/50 backdrop-blur-md border border-white/20',
      gradient: 'bg-gradient-to-r from-black/40 to-black/50 backdrop-blur-md border border-white/30',
      success: 'bg-green-900/70 backdrop-blur-md border border-green-500/50',
      info: 'bg-blue-900/70 backdrop-blur-md border border-blue-500/50',
      warning: 'bg-orange-900/70 backdrop-blur-md border border-orange-500/50'
    };

    const Component = hover ? motion.div : 'div';

    return (
      <Component
        ref={ref}
        className={cn(
          'rounded-2xl p-6 transition-all duration-300',
          variants[variant],
          hover && 'hover:bg-white/15 hover:border-white/30',
          className
        )}
        {...(hover && {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 }
        })}
      >
        {children}
      </Component>
    );
  }
);

OnboardingCard.displayName = 'OnboardingCard';
