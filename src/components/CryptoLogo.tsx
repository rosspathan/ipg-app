import React, { useState } from 'react';
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
  const [imgError, setImgError] = useState(false);
  
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
      {imgError ? (
        <span className="text-xs font-bold">{symbol.charAt(0)}</span>
      ) : (
        <img
          src={logoUrl}
          alt={`${symbol} logo`}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
};

export default CryptoLogo;
