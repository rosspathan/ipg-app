import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OnboardingCardProps {
  children: ReactNode;
  variant?: 'glass' | 'glass-dark' | 'gradient';
  hover?: boolean;
  className?: string;
}

export const OnboardingCard = forwardRef<HTMLDivElement, OnboardingCardProps>(
  ({ children, variant = 'glass', hover = false, className }, ref) => {
    const variants = {
      glass: 'bg-white/10 backdrop-blur-sm border border-white/20',
      'glass-dark': 'bg-white/5 backdrop-blur-sm border border-white/10',
      gradient: 'bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20'
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
