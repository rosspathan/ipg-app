import { FC } from 'react';

interface MetalTextureProps {
  opacity?: number;
  pattern?: 'guilloché' | 'confetti' | 'brush' | 'lattice' | 'aurora';
}

export const MetalTexture: FC<MetalTextureProps> = ({ 
  opacity = 0.06,
  pattern = 'guilloché'
}) => {
  const patterns = {
    guilloché: (
      <pattern id="guilloche" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
        <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.2"/>
      </pattern>
    ),
    confetti: (
      <pattern id="confetti" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1" fill="currentColor" opacity="0.4"/>
        <circle cx="15" cy="10" r="1.5" fill="currentColor" opacity="0.3"/>
        <circle cx="25" cy="8" r="1" fill="currentColor" opacity="0.5"/>
        <circle cx="8" cy="20" r="1.2" fill="currentColor" opacity="0.3"/>
        <circle cx="20" cy="25" r="1" fill="currentColor" opacity="0.4"/>
      </pattern>
    ),
    brush: (
      <pattern id="brush" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="40" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
        <line x1="10" y1="0" x2="50" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
        <line x1="-10" y1="0" x2="30" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
      </pattern>
    ),
    lattice: (
      <pattern id="lattice" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
        <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
        <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.1"/>
      </pattern>
    ),
    aurora: (
      <pattern id="aurora" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M0,25 Q12.5,15 25,25 T50,25" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
        <path d="M0,20 Q12.5,10 25,20 T50,20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
        <path d="M0,30 Q12.5,20 25,30 T50,30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
      </pattern>
    ),
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }}>
      <defs>
        {patterns[pattern]}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pattern})`} />
    </svg>
  );
};

export const ClipOverlay: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      className={className} 
      width="100%" 
      height="48" 
      viewBox="0 0 360 48" 
      fill="none"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
    >
      {/* Metal bar */}
      <rect width="360" height="48" fill="url(#metalGradient)" />
      
      {/* Screws */}
      <circle cx="20" cy="24" r="4" fill="url(#screwGradient)" />
      <circle cx="340" cy="24" r="4" fill="url(#screwGradient)" />
      <circle cx="20" cy="24" r="2" fill="#1a1f33" opacity="0.3" />
      <circle cx="340" cy="24" r="2" fill="#1a1f33" opacity="0.3" />
      
      {/* Lens flare */}
      <ellipse cx="30" cy="20" rx="8" ry="4" fill="white" opacity="0.15" />
      
      <defs>
        <linearGradient id="metalGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
        </linearGradient>
        <radialGradient id="screwGradient">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="70%" stopColor="rgba(150,150,150,0.3)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </radialGradient>
      </defs>
    </svg>
  );
};
