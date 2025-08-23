import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssetLogoProps {
  symbol: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AssetLogo = ({ symbol, logoUrl, size = 'md', className = '' }: AssetLogoProps) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const fallbackText = symbol.slice(0, 2).toUpperCase();

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {logoUrl && !imageError ? (
        <AvatarImage
          src={logoUrl}
          alt={`${symbol} logo`}
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
};

export default AssetLogo;