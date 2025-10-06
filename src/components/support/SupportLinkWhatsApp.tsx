import { FC, ReactNode, MouseEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { openWhatsAppLink, WaSupportConfig, DEFAULT_WA_CONFIG } from '@/lib/support/wa';
import { cn } from '@/lib/utils';

interface SupportLinkWhatsAppProps {
  /** Phone number in E.164 format (optional, uses admin default if not provided) */
  phone?: string;
  /** Message text (optional, uses admin default if not provided) */
  text?: string;
  /** Custom children (optional, defaults to icon + "Support") */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom config (optional, merges with admin defaults) */
  config?: Partial<WaSupportConfig>;
  /** Additional props to pass to the button */
  [key: string]: any;
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
 * // Default (uses admin settings)
 * <SupportLinkWhatsApp />
 * 
 * // Custom phone/message
 * <SupportLinkWhatsApp phone="+919133444118" text="Help needed" />
 * 
 * // Custom children
 * <SupportLinkWhatsApp>
 *   <IconHelp /> Get Help
 * </SupportLinkWhatsApp>
 * ```
 */
export const SupportLinkWhatsApp: FC<SupportLinkWhatsAppProps> = ({
  phone,
  text,
  children,
  className,
  config,
  ...props
}) => {
  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2",
        "transition-colors duration-200",
        className
      )}
      data-testid="wa-support-link"
      title="WhatsApp Support"
      {...props}
    >
      {children || (
        <>
          <MessageCircle className="h-4 w-4" />
          <span>Support</span>
        </>
      )}
    </button>
  );
};
