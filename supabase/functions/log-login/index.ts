import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require a valid Supabase JWT and derive identity from it.
    // The previous version trusted client-supplied user_id/email, which
    // allowed forging arbitrary login_history records.
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn("[log-login] JWT validation failed", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user_id = claimsData.claims.sub as string;
    const verifiedEmail = (claimsData.claims.email as string | undefined) ?? null;

    let body: { user_agent?: string; referer?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { user_agent, referer } = body;

    console.log("[log-login] Authenticated login event for:", verifiedEmail || user_id);

    // Extract IP from request headers
    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    console.log("[log-login] IP address:", ip_address);

    // Fetch geolocation using HTTPS-compatible API
    let geo: {
      city?: string;
      region?: string;
      country?: string;
      lat?: number;
      lon?: number;
      isp?: string;
    } = {};

    if (ip_address && ip_address !== "unknown") {
      try {
        const geoRes = await fetch(
          `https://ipapi.co/${ip_address}/json/`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (!geoData.error) {
            geo = {
              city: geoData.city || null,
              region: geoData.region || null,
              country: geoData.country_name || null,
              lat: geoData.latitude || null,
              lon: geoData.longitude || null,
              isp: geoData.org || null,
            };
          } else {
            console.warn("[log-login] Geo API error:", geoData.reason);
          }
        } else {
          const errText = await geoRes.text();
          console.warn("[log-login] Geo API HTTP error:", geoRes.status, errText);
        }
      } catch (geoErr) {
        console.warn("[log-login] Geolocation lookup failed:", geoErr);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("login_history").insert({
      user_id,
      email: verifiedEmail,
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
      console.error("[log-login] DB insert error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[log-login] ✅ Success: ${verifiedEmail || user_id} from ${ip_address} | ${geo.city || "?"}, ${geo.region || "?"}, ${geo.country || "?"}`
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[log-login] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
