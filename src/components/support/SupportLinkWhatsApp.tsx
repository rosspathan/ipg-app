import { FC, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { openWhatsAppLink, WaSupportConfig, DEFAULT_WA_CONFIG } from '@/lib/support/wa';
import { IconButton } from '@/components/ui/icon-button';
import IconWhatsApp from '@/components/icons/IconWhatsApp';
import { cn } from '@/lib/utils';

interface SupportLinkWhatsAppProps {
  /** Visual variant - inline (transparent) or fab (filled) */
  variant?: 'inline' | 'fab';
  /** Phone number in E.164 format (optional, uses admin default if not provided) */
  phone?: string;
  /** Message text (optional, uses admin default if not provided) */
  text?: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom config (optional, merges with admin defaults) */
  config?: Partial<WaSupportConfig>;
}

/**
 * Universal WhatsApp Support Link Component
 * 
 * Handles platform detection and multiple fallback strategies:
 * 1. Primary: wa.me (official universal link)
 * 2. Secondary: Custom scheme (whatsapp://)
 * 3. Fallback: Play Store (Android) or support page (others)
 * 
 * Usage:
 * ```tsx
 * // Default inline (header)
 * <SupportLinkWhatsApp variant="inline" />
 * 
 * // Floating action button
 * <SupportLinkWhatsApp variant="fab" />
 * 
 * // Custom phone/message
 * <SupportLinkWhatsApp phone="+919133444118" text="Help needed" />
 * ```
 */
export const SupportLinkWhatsApp: FC<SupportLinkWhatsAppProps> = ({
  variant = 'inline',
  phone,
  text,
  className,
  config,
}) => {
  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Merge admin defaults with props and custom config
    const finalConfig = {
      ...DEFAULT_WA_CONFIG,
      ...config
    };
    
    const finalPhone = phone || finalConfig.whatsapp_phone_e164;
    const finalText = text || finalConfig.default_message;
    
    await openWhatsAppLink(finalPhone, finalText, finalConfig);
  };

  // Build wa.me link for href (fallback)
  const finalPhone = phone || DEFAULT_WA_CONFIG.whatsapp_phone_e164;
  const finalText = text || DEFAULT_WA_CONFIG.default_message;
  const waLink = `https://wa.me/${finalPhone.replace(/\D/g, '')}?text=${encodeURIComponent(finalText)}`;

  const computedClass = cn(
    variant === 'fab' ? 'fixed bottom-24 right-5 z-[60]' : undefined,
    className
  );

  const buttonEl = (
    <IconButton
      as="a"
      variant={variant}
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support on WhatsApp"
      className={computedClass}
      onClick={handleClick}
    >
      <IconWhatsApp className={variant === 'inline' ? 'w-6 h-6' : 'w-7 h-7'} />
    </IconButton>
  );

  if (variant === 'fab') {
    const portalRoot = typeof document !== 'undefined' ? document.getElementById('dock-portal') : null;
    return portalRoot ? createPortal(buttonEl, portalRoot) : buttonEl;
  }

  return buttonEl;
};
