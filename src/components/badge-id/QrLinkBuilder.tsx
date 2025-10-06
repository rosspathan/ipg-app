import { QRCodeSVG } from 'qrcode.react';
import { FC } from 'react';

interface QrLinkBuilderProps {
  code: string;
  size?: number;
  logoUrl?: string;
  className?: string;
}

const APP_HOST = "https://i-smartapp.com";
const REF_BASE_PATH = "/r";

export const QrLinkBuilder: FC<QrLinkBuilderProps> = ({
  code,
  size = 120,
  logoUrl = "/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png",
  className = ""
}) => {
  const referralUrl = `${APP_HOST}${REF_BASE_PATH}/${code}`;

  return (
    <div className={`relative ${className}`} data-testid="qr-link-builder">
      <QRCodeSVG
        value={referralUrl}
        size={size}
        level="H"
        includeMargin={true}
        fgColor="hsl(0 0% 6%)"
        bgColor="#ffffff"
        imageSettings={{
          src: logoUrl,
          height: size * 0.2,
          width: size * 0.2,
          excavate: true,
        }}
      />
    </div>
  );
};

export function buildReferralLink(code: string): string {
  return `${APP_HOST}${REF_BASE_PATH}/${code}`;
}
