/**
 * WhatsApp Universal Link Builder
 * Handles wa.me links, custom schemes, and Android Intents
 */

export interface WaSupportConfig {
  whatsapp_phone_e164: string;
  default_message: string;
  host: string;
  custom_scheme: string;
  play_fallback_url: string;
  web_fallback_url: string;
  open_target: '_blank' | '_self';
}

export const DEFAULT_WA_CONFIG: WaSupportConfig = {
  whatsapp_phone_e164: '+919133444118',
  default_message: 'Hello iSMART support',
  host: 'https://wa.me',
  custom_scheme: 'whatsapp',
  play_fallback_url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
  web_fallback_url: '/support',
  open_target: '_blank'
};

/**
 * Sanitize phone number to E.164 format
 * Preserves leading +, removes all other non-digits
 */
export function sanitizeE164(number: string): string {
  if (!number) return '';
  
  // Remove all non-digits except leading +
  const hasPlus = number.trim().startsWith('+');
  const digits = number.replace(/\D/g, '');
  
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Build wa.me URL (universal link - works on all platforms)
 * @param phone - Phone number in E.164 format
 * @param text - Message text (will be URL encoded)
 * @param host - Host URL (default: https://wa.me)
 */
export function buildWaMeUrl(phone: string, text: string, host: string = DEFAULT_WA_CONFIG.host): string {
  const digits = sanitizeE164(phone).replace(/^\+/, ''); // wa.me uses digits only, no +
  const encodedText = encodeURIComponent(text || '');
  return `${host}/${digits}${text ? `?text=${encodedText}` : ''}`;
}

/**
 * Build custom scheme URL (whatsapp://)
 * Opens app directly on devices with WhatsApp installed
 */
export function buildSchemeUrl(phone: string, text: string, scheme: string = DEFAULT_WA_CONFIG.custom_scheme): string {
  const digits = sanitizeE164(phone).replace(/^\+/, '');
  const encodedText = encodeURIComponent(text || '');
  return `${scheme}://send?phone=${digits}${text ? `&text=${encodedText}` : ''}`;
}

/**
 * Build Android Intent URL
 * Fallback for older Android devices that don't support App Links
 */
export function buildIntentUrl(phone: string, text: string): string {
  const digits = sanitizeE164(phone).replace(/^\+/, '');
  const encodedText = encodeURIComponent(text || '');
  return `intent://send/?phone=${digits}${text ? `&text=${encodedText}` : ''}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
}

/**
 * Detect platform and return appropriate strategy
 */
export function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMobile = isAndroid || isIOS;
  const isDesktop = !isMobile;
  
  // Check if running in TWA or native app context
  const isTWA = 'matchMedia' in window && window.matchMedia('(display-mode: standalone)').matches;
  
  return {
    isAndroid,
    isIOS,
    isMobile,
    isDesktop,
    isTWA,
    userAgent: ua
  };
}

/**
 * Open WhatsApp link with platform-specific fallback strategy
 */
export async function openWhatsAppLink(
  phone: string,
  text: string,
  config: Partial<WaSupportConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_WA_CONFIG, ...config };
  const platform = detectPlatform();
  
  const waMeUrl = buildWaMeUrl(phone, text, finalConfig.host);
  const schemeUrl = buildSchemeUrl(phone, text, finalConfig.custom_scheme);
  const intentUrl = buildIntentUrl(phone, text);
  
  console.info('WA_LINK_SCHEME', schemeUrl);
  console.info('WA_LINK_PRIMARY', waMeUrl);
  console.info('WA_LINK_FALLBACK', finalConfig.web_fallback_url);
  
  // Strategy 1: Try Custom Scheme first to bypass web blocks (opens app directly if installed)
  try {
    window.location.href = schemeUrl;

    // Wait to see if the app opens
    await new Promise(resolve => setTimeout(resolve, 900));

    // Strategy 2: On Android (older devices), try Intent URL
    if (!document.hidden && platform.isAndroid) {
      window.location.href = intentUrl;
      await new Promise(resolve => setTimeout(resolve, 900));
    }

    // Strategy 3: If still visible, use wa.me universal link (opens Web/Desktop)
    if (!document.hidden) {
      if (finalConfig.open_target === '_blank') {
        window.open(waMeUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = waMeUrl;
      }

      // Wait again
      await new Promise(resolve => setTimeout(resolve, 900));

      // Strategy 4: Final fallback
      if (!document.hidden) {
        console.info('WA_LINK_USING_FALLBACK');
        if (platform.isAndroid) {
          window.open(finalConfig.play_fallback_url, '_blank', 'noopener,noreferrer');
        } else {
          if (finalConfig.web_fallback_url.startsWith('http')) {
            window.open(finalConfig.web_fallback_url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = finalConfig.web_fallback_url;
          }
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp link error:', error);
    // Final fallback on error
    if (finalConfig.web_fallback_url.startsWith('http')) {
      window.open(finalConfig.web_fallback_url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = finalConfig.web_fallback_url;
    }
  }
}
