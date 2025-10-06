// Utility to open WhatsApp reliably across platforms
// - On mobile: tries deep link whatsapp:// then falls back to api.whatsapp.com
// - On desktop: opens api.whatsapp.com in a new tab (avoids web.whatsapp.com blocks)
export function openWhatsApp(phone: string, message: string = "") {
  const digits = (phone || "").replace(/\D/g, "");
  const encoded = encodeURIComponent(message || "");

  const appLink = `whatsapp://send?phone=${digits}&text=${encoded}`;
  const apiLink = `https://api.whatsapp.com/send?phone=${digits}&text=${encoded}`;

  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

  try {
    if (isMobile) {
      // Try to open the app directly; if it fails, fall back to the web link
      const start = Date.now();
      // Navigate current tab to deep link (required by some browsers)
      window.location.href = appLink;
      // Fallback after a short delay if app didn't open
      setTimeout(() => {
        // If user is still here after 800ms, open the web fallback
        if (Date.now() - start < 2000) {
          window.location.href = apiLink;
        }
      }, 800);
    } else {
      // Desktop: use api.whatsapp.com which often redirects to Desktop app or Web
      window.open(apiLink, "_blank", "noopener,noreferrer");
    }
  } catch {
    // Last-resort fallback
    window.open(apiLink, "_blank", "noopener,noreferrer");
  }
}
