import { supabase } from "@/integrations/supabase/client";

/**
 * Central login tracker: records every sign-in and every session restore
 * (app reopen while still signed in) with device + location details.
 * Mounted once at app root; fires exactly once per browser tab session.
 */

const SESSION_FLAG = "login_tracked_session";

function getDeviceId(): string {
  try {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("device_id", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function parseUA(ua: string): { device_type: string; os: string; browser: string } {
  const device_type = /Mobi|Android|iPhone|iPad/i.test(ua)
    ? (/iPad|Tablet/i.test(ua) ? "tablet" : "mobile")
    : "desktop";
  let os = "Unknown";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  return { device_type, os, browser };
}

async function getGps(): Promise<{ lat?: number; lon?: number; acc?: number }> {
  if (!("geolocation" in navigator)) return {};
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({}), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timer);
        resolve({});
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

export async function trackLogin(eventType: "sign_in" | "session_restore"): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, "1");

    const ua = navigator.userAgent;
    const { device_type, os, browser } = parseUA(ua);
    const gps = await getGps();

    await supabase.functions.invoke("log-login", {
      body: {
        user_agent: ua,
        referer: window.location.href,
        event_type: eventType,
        device_type,
        os,
        browser,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: (navigator as any).userAgentData?.platform || navigator.platform || null,
        device_id: getDeviceId(),
        gps_latitude: gps.lat ?? null,
        gps_longitude: gps.lon ?? null,
        gps_accuracy: gps.acc ?? null,
      },
    });
  } catch (err) {
    console.warn("[login-tracker] failed:", err);
  }
}

/** Mount once at app root. */
export function initLoginTracker(): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!session) return;
    if (event === "SIGNED_IN") void trackLogin("sign_in");
    else if (event === "INITIAL_SESSION") void trackLogin("session_restore");
  });
  return () => subscription.unsubscribe();
}
