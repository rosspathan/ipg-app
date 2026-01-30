import React from 'react';
import { useAssetLogos } from '@/hooks/useAssetLogos';
import { getCryptoLogoUrl } from '@/config/cryptoLogos';

interface CryptoLogoProps {
  symbol: string;
  logoFilePath?: string | null;
  fallbackUrl?: string | null;
  size?: number;
  className?: string;
}

const CryptoLogo: React.FC<CryptoLogoProps> = ({
  symbol,
  logoFilePath,
  fallbackUrl,
  size = 32,
  className = ""
}) => {
  const { getLogoUrl } = useAssetLogos();
  
  // Custom logos take priority
  const customLogo = getCryptoLogoUrl(symbol, null);
  const logoUrl = customLogo !== '/placeholder-crypto.svg' 
    ? customLogo 
    : getLogoUrl(logoFilePath, fallbackUrl);

  return (
    <div 
      className={`rounded-full overflow-hidden bg-muted flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={`${symbol} logo`}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            target.parentElement.innerHTML = `<span class="text-xs font-bold">${symbol.charAt(0)}</span>`;
          }
        }}
      />
    </div>
  );
};

export default CryptoLogo;