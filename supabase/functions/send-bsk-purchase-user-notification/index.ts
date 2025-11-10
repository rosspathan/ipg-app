import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Listen to user_notifications table for BSK purchase decisions
    const { data: payload } = await req.json()
    
    if (!payload || payload.type !== 'INSERT') {
      console.log('[BSK User Notification] Not an INSERT event, skipping')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const notification = payload.record
    
    if (!notification.type.startsWith('bsk_purchase_')) {
      console.log('[BSK User Notification] Not a purchase notification, skipping')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[BSK User Notification] Processing user notification:', notification.id)

    // Get user email
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(notification.user_id)
    
    if (userError || !user?.email) {
      console.error('[BSK User Notification] Error fetching user:', userError)
      throw new Error('User not found')
    }

    const metadata = notification.metadata || {}
    const isApproved = notification.type === 'bsk_purchase_approved'

    console.log(`[BSK User Notification] Would send email to ${user.email}:`)
    console.log(`  Subject: ${notification.title}`)
    console.log(`  Message: ${notification.message}`)
    
    // TODO: Integrate with actual email service
    // await sendEmail({
    //   to: user.email,
    //   subject: notification.title,
    //   html: `
    //     <h2>${notification.title}</h2>
    //     <p>${notification.message}</p>
    //     ${isApproved ? `
    //       <p><strong>Purchase Amount:</strong> ${metadata.amount} BSK</p>
    //       <p><strong>Total Received:</strong> ${metadata.total_received} BSK</p>
    //       <p style="color: #16a34a;">Your BSK has been credited to your account!</p>
    //     ` : `
    //       <p><strong>Purchase Amount:</strong> ${metadata.amount} BSK</p>
    //       <p><strong>Reason:</strong> ${metadata.reason}</p>
    //       <p style="color: #dc2626;">Please contact support if you have questions.</p>
    //     `}
    //   `
    // })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User notification processed',
        user_email: user.email 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[BSK User Notification] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
