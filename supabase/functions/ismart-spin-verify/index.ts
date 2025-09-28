import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRequest {
  server_seed: string
  client_seed: string
  nonce: number
  segments: Array<{
    id: string
    label: string
    multiplier: number
    weight: number
    color_hex: string
  }>
  expected_hash?: string
}

async function calculateSpinResult(serverSeed: string, clientSeed: string, nonce: number, segments: any[]) {
  // Create hash input
  const hashInput = `${serverSeed}:${clientSeed}:${nonce}`
  
  // Generate SHA-256 hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
  const hashResult = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Convert first 8 hex chars to integer
  const hashInt = parseInt(hashResult.substring(0, 8), 16)
  
  // Calculate total weight
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
  
  // Calculate target value
  const targetValue = hashInt % totalWeight
  
  // Find winning segment
  let runningWeight = 0
  for (let i = 0; i < segments.length; i++) {
    runningWeight += segments[i].weight
    if (targetValue < runningWeight) {
      return {
        segmentIndex: i,
        segment: segments[i],
        hashResult,
        hashInt,
        totalWeight,
        targetValue,
        runningWeight
      }
    }
  }
  
  // Fallback (should never reach here)
  return {
    segmentIndex: 0,
    segment: segments[0],
    hashResult,
    hashInt,
    totalWeight,
    targetValue,
    runningWeight: segments[0].weight
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { server_seed, client_seed, nonce, segments, expected_hash }: VerifyRequest = await req.json()

    if (!server_seed || !client_seed || nonce === undefined || !segments) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify server seed hash if provided
    let serverSeedVerification = null
    if (expected_hash) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(server_seed))
      const computedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
      serverSeedVerification = {
        provided_hash: expected_hash,
        computed_hash: computedHash,
        valid: computedHash === expected_hash
      }
    }

    // Calculate the spin result
    const result = await calculateSpinResult(server_seed, client_seed, nonce, segments)

    // Calculate percentage probability for each segment
    const segmentProbabilities = segments.map(segment => ({
      ...segment,
      probability: (segment.weight / result.totalWeight * 100).toFixed(2) + '%'
    }))

    return new Response(JSON.stringify({
      success: true,
      verification: {
        inputs: {
          server_seed,
          client_seed,
          nonce,
          segments: segmentProbabilities
        },
        calculation: {
          hash_input: `${server_seed}:${client_seed}:${nonce}`,
          hash_result: result.hashResult,
          hash_int: result.hashInt,
          total_weight: result.totalWeight,
          target_value: result.targetValue,
          winning_segment_index: result.segmentIndex,
          winning_segment: result.segment
        },
        result: {
          segment_index: result.segmentIndex,
          segment_label: result.segment.label,
          multiplier: result.segment.multiplier,
          color: result.segment.color_hex
        },
        server_seed_verification: serverSeedVerification,
        steps: [
          `1. Combine seeds: "${server_seed}:${client_seed}:${nonce}"`,
          `2. SHA-256 hash: ${result.hashResult}`,
          `3. Take first 8 hex chars: ${result.hashResult.substring(0, 8)}`,
          `4. Convert to integer: ${result.hashInt}`,
          `5. Calculate target: ${result.hashInt} % ${result.totalWeight} = ${result.targetValue}`,
          `6. Find segment: Running weight ${result.runningWeight} > target ${result.targetValue}`,
          `7. Winner: ${result.segment.label} (${result.segment.multiplier}x)`
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Verify error:', error)
    return new Response(JSON.stringify({ error: 'Verification failed', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})