/**
 * Verify Security PIN — server-side gate for sensitive actions
 * (e.g. revealing/copying/downloading the wallet recovery phrase).
 *
 * - Requires authenticated user (verify_jwt = true)
 * - Validates 6-digit PIN against `security.pin_hash` (PBKDF2-SHA256, 200k iter)
 * - Brute-force protection: 5 failed attempts → 30 min lock
 * - Audits success/failure to `login_audit`
 * - Never returns or logs the PIN
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashPinPbkdf2(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'UNAUTHORIZED' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return json({ success: false, error: 'INVALID_TOKEN' }, 401);

    const body = await req.json().catch(() => ({}));
    const pin: string | undefined = body?.pin;
    const purpose: string = typeof body?.purpose === 'string' ? body.purpose : 'sensitive_action';

    if (!pin || !/^\d{6}$/.test(pin)) {
      return json({ success: false, error: 'PIN_REQUIRED', message: 'Please enter your 6-digit security PIN.' }, 400);
    }

    const { data: securityRow, error: securityError } = await supabase
      .from('security')
      .select('pin_hash, pin_salt, pin_set, locked_until, failed_attempts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (securityError) {
      console.error('[verify-security-pin] lookup failed:', securityError);
      return json({ success: false, error: 'PIN_LOOKUP_FAILED', message: 'Could not verify your security PIN. Please try again.' }, 500);
    }

    if (!securityRow?.pin_set || !securityRow.pin_hash || !securityRow.pin_salt) {
      return json({
        success: false,
        error: 'PIN_NOT_SET',
        message: 'Please set your security PIN first before viewing your recovery phrase.',
      }, 400);
    }

    if (securityRow.locked_until && new Date(securityRow.locked_until).getTime() > Date.now()) {
      return json({
        success: false,
        error: 'PIN_LOCKED',
        message: 'Your account is temporarily locked due to too many failed PIN attempts. Try again later.',
        locked_until: securityRow.locked_until,
      }, 429);
    }

    const computedHash = await hashPinPbkdf2(pin, securityRow.pin_salt);

    if (computedHash !== securityRow.pin_hash) {
      const newAttempts = (securityRow.failed_attempts || 0) + 1;
      const shouldLock = newAttempts >= 5;
      await supabase.from('security').update({
        failed_attempts: newAttempts,
        locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
      }).eq('user_id', user.id);

      await supabase.from('login_audit').insert({
        user_id: user.id,
        event: 'security_pin_failed',
        device_info: { surface: 'verify-security-pin', purpose },
      });

      return json({
        success: false,
        error: 'PIN_INVALID',
        message: shouldLock
          ? 'Incorrect PIN. Account temporarily locked for 30 minutes.'
          : `Incorrect PIN. Please try again. ${5 - newAttempts} attempts remaining.`,
        attempts_remaining: Math.max(0, 5 - newAttempts),
      }, 401);
    }

    // Success
    if ((securityRow.failed_attempts || 0) > 0) {
      await supabase.from('security').update({
        failed_attempts: 0,
        locked_until: null,
      }).eq('user_id', user.id);
    }

    await supabase.from('login_audit').insert({
      user_id: user.id,
      event: 'security_pin_success',
      device_info: { surface: 'verify-security-pin', purpose },
    });

    return json({ success: true, verified_at: new Date().toISOString(), purpose });
  } catch (err) {
    console.error('[verify-security-pin] error:', err);
    return json({ success: false, error: 'INTERNAL_ERROR', message: 'Verification failed. Please try again.' }, 500);
  }
});
