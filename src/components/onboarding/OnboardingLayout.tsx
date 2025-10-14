import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OnboardingLayoutProps {
  children: ReactNode;
  gradientVariant?: 'primary' | 'secondary' | 'success';
  showAnimatedBackground?: boolean;
  className?: string;
}

export function OnboardingLayout({
  children,
  gradientVariant = 'primary',
  showAnimatedBackground = true,
  className
}: OnboardingLayoutProps) {
  const gradients = {
    primary: 'from-slate-900 via-purple-900 to-slate-900',
    secondary: 'from-purple-900 via-indigo-900 to-slate-900',
    success: 'from-emerald-900 via-purple-900 to-slate-900'
  };

  return (
    <div
      className={cn(
        "h-screen overflow-hidden relative",
        `bg-gradient-to-br ${gradients[gradientVariant]}`
      )}
      style={{ height: '100dvh' }}
    >
      {/* Animated Background Elements */}
      {showAnimatedBackground && (
        <>
          <motion.div
            className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </>
      )}

      {/* Content */}
      <div
        className={cn("relative z-10 h-full flex flex-col px-6", className)}
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
