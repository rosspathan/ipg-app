import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createHash } from 'https://deno.land/std@0.190.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRequest {
  server_seed: string
  client_seed: string
  nonce: number
  expected_result_hash?: string
}

// Convert hex string to decimal for calculation
function hexToDecimal(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) / 0xffffffff
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { server_seed, client_seed, nonce, expected_result_hash }: VerifyRequest = await req.json()

    if (!server_seed || !client_seed || nonce === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify server seed hash if provided
    let server_seed_verification = null
    if (expected_result_hash) {
      const computed_hash = createHash('sha256').update(server_seed).digest('hex')
      server_seed_verification = {
        provided_hash: expected_result_hash,
        computed_hash,
        valid: computed_hash === expected_result_hash
      }
    }

    // Generate the result hash
    const result_hash = createHash('sha256')
      .update(`${server_seed}:${client_seed}:${nonce}`)
      .digest('hex')
    
    // Calculate the random number
    const random_number = hexToDecimal(result_hash)

    // Return verification result
    return new Response(JSON.stringify({
      success: true,
      verification: {
        server_seed,
        client_seed,
        nonce,
        result_hash,
        random_number,
        server_seed_verification,
        calculation_steps: [
          `1. Combine: "${server_seed}:${client_seed}:${nonce}"`,
          `2. SHA-256 hash: ${result_hash}`,
          `3. Take first 8 hex chars: ${result_hash.slice(0, 8)}`,
          `4. Convert to decimal: ${parseInt(result_hash.slice(0, 8), 16)}`,
          `5. Normalize (0-1): ${random_number}`
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Verify error:', error)
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})