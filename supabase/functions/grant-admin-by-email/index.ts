import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin creation is permanently disabled. Only rosspathan@gmail.com is admin.
  return new Response(
    JSON.stringify({ error: "Admin creation is disabled. Only one admin account is allowed." }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
