/**
 * Utility for copying text to clipboard with fallback support
 */

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Modern clipboard API (preferred method)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback method for older browsers or non-secure contexts
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.warn('Clipboard API failed, trying fallback:', error);
    return fallbackCopyToClipboard(text);
  }
};

const fallbackCopyToClipboard = (text: string): boolean => {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.style.zIndex = '-1';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // For iOS Safari
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
    }
    
    // Execute copy command
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
};