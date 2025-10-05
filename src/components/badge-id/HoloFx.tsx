import { FC } from 'react';
import { cn } from '@/lib/utils';

interface HoloFxProps {
  intensity?: number;
  className?: string;
  disabled?: boolean;
}

export const HoloFx: FC<HoloFxProps> = ({ 
  intensity = 0.5, 
  className = '',
  disabled = false 
}) => {
  if (disabled) {
    return (
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          "bg-gradient-to-br from-white/5 to-transparent",
          className
        )}
        data-testid="badge-id-fx"
      />
    );
  }

  return (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className
      )}
      data-testid="badge-id-fx"
      style={{
        opacity: intensity,
      }}
    >
      {/* Animated shine sweep */}
      <div 
        className="absolute inset-0 animate-shine"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shine 3s ease-in-out infinite',
        }}
      />
      
      {/* Spectral sweep */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(139,92,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export const ShineFx: FC<HoloFxProps> = HoloFx;
