import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, user_agent, referer } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IP from request headers
    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Fetch geolocation from IP
    let geo: { city?: string; region?: string; country?: string; lat?: number; lon?: number; isp?: string } = {};
    if (ip_address && ip_address !== "unknown") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip_address}?fields=city,regionName,country,lat,lon,isp`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          geo = {
            city: geoData.city || null,
            region: geoData.regionName || null,
            country: geoData.country || null,
            lat: geoData.lat || null,
            lon: geoData.lon || null,
            isp: geoData.isp || null,
          };
        }
      } catch (geoErr) {
        console.error("Geolocation lookup failed:", geoErr);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("login_history").insert({
      user_id,
      email: email || null,
      ip_address,
      user_agent: user_agent || null,
      referer: referer || null,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      latitude: geo.lat || null,
      longitude: geo.lon || null,
      isp: geo.isp || null,
    });

    if (error) {
      console.error("Error logging login:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Login logged for ${email || user_id} from IP: ${ip_address} | ${geo.city}, ${geo.region}, ${geo.country}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-login error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
